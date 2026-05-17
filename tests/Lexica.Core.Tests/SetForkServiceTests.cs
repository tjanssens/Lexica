using Lexica.Core.Entities;
using Lexica.Core.Enums;
using Lexica.Infrastructure.Services;
using Lexica.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Lexica.Core.Tests;

public class SetForkServiceTests
{
    private static AppDbContext NewDb([System.Runtime.CompilerServices.CallerMemberName] string name = "")
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"test-{name}-{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(options);
    }

    private static async Task<(ApplicationUser owner, ApplicationUser subscriber, Set set)> SeedSharedSetAsync(AppDbContext db)
    {
        var owner = new ApplicationUser { Id = Guid.NewGuid(), UserName = "owner", DisplayName = "Owner Name" };
        var subscriber = new ApplicationUser { Id = Guid.NewGuid(), UserName = "sub", DisplayName = "Sub" };
        db.Users.Add(owner);
        db.Users.Add(subscriber);

        var w1 = new Word { Id = Guid.NewGuid(), UserId = owner.Id, Number = 1, Language = Language.Latin, Term = "amare", Translation = "houden van" };
        var w2 = new Word { Id = Guid.NewGuid(), UserId = owner.Id, Number = 2, Language = Language.Latin, Term = "videre", Translation = "zien" };
        db.Words.AddRange(w1, w2);

        var set = new Set { Id = Guid.NewGuid(), UserId = owner.Id, Name = "Les 1", Language = Language.Latin, IsPublic = true };
        set.SetWords.Add(new SetWord { SetId = set.Id, WordId = w1.Id });
        set.SetWords.Add(new SetWord { SetId = set.Id, WordId = w2.Id });
        db.Sets.Add(set);

        db.SetSubscriptions.Add(new SetSubscription { UserId = subscriber.Id, SetId = set.Id });

        // Subscriber heeft al wat progress op w1 (via subscription)
        db.UserWordProgress.Add(new UserWordProgress
        {
            UserId = subscriber.Id, WordId = w1.Id,
            Easiness = 2.8, Interval = 7, Repetitions = 3,
            DueDate = DateTime.UtcNow.Date.AddDays(7), TimesReviewed = 3, Notes = "moeilijk!"
        });

        await db.SaveChangesAsync();
        return (owner, subscriber, set);
    }

    [Fact]
    public async Task CopySetAsync_MaaktDiepeKopieMetNieuweEigenaar()
    {
        using var db = NewDb();
        var (owner, subscriber, set) = await SeedSharedSetAsync(db);
        var service = new SetForkService(db);

        var copy = await service.CopySetAsync(set.Id, subscriber.Id);

        Assert.NotEqual(set.Id, copy.Id);
        Assert.Equal(subscriber.Id, copy.UserId);
        Assert.Equal("Les 1", copy.Name);
        Assert.Equal(Language.Latin, copy.Language);
        Assert.False(copy.IsPublic);

        var copyWords = await db.SetWords.Where(sw => sw.SetId == copy.Id).Include(sw => sw.Word).ToListAsync();
        Assert.Equal(2, copyWords.Count);
        Assert.All(copyWords, sw => Assert.Equal(subscriber.Id, sw.Word.UserId));
        Assert.All(copyWords, sw => Assert.Equal("Owner Name", sw.Word.OriginalAuthorDisplayName));
        Assert.All(copyWords, sw => Assert.NotNull(sw.Word.SourceWordId));
    }

    [Fact]
    public async Task CopySetAsync_NeemtSm2ProgressMee()
    {
        using var db = NewDb();
        var (owner, subscriber, set) = await SeedSharedSetAsync(db);
        var service = new SetForkService(db);

        var copy = await service.CopySetAsync(set.Id, subscriber.Id);

        var copyWords = await db.SetWords.Where(sw => sw.SetId == copy.Id).Include(sw => sw.Word).ToListAsync();
        var amareCopy = copyWords.Single(sw => sw.Word.Term == "amare").Word;

        var progress = await db.UserWordProgress.SingleOrDefaultAsync(p =>
            p.UserId == subscriber.Id && p.WordId == amareCopy.Id);
        Assert.NotNull(progress);
        Assert.Equal(2.8, progress!.Easiness);
        Assert.Equal(7, progress.Interval);
        Assert.Equal(3, progress.Repetitions);
        Assert.Equal("moeilijk!", progress.Notes);
    }

    [Fact]
    public async Task CopySetAsync_ZegtSubscriptionAutomatischOp()
    {
        using var db = NewDb();
        var (owner, subscriber, set) = await SeedSharedSetAsync(db);
        var service = new SetForkService(db);

        await service.CopySetAsync(set.Id, subscriber.Id);

        var stillSubscribed = await db.SetSubscriptions.AnyAsync(s => s.UserId == subscriber.Id && s.SetId == set.Id);
        Assert.False(stillSubscribed);
    }

    [Fact]
    public async Task CopySetAsync_WeigertEigenSet()
    {
        using var db = NewDb();
        var (owner, _, set) = await SeedSharedSetAsync(db);
        var service = new SetForkService(db);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CopySetAsync(set.Id, owner.Id));
    }

    [Fact]
    public async Task CopySetAsync_WeigertGeenToegang()
    {
        using var db = NewDb();
        var (_, _, set) = await SeedSharedSetAsync(db);
        var randomUserId = Guid.NewGuid();
        // Set is publiek (uit Seed), zou wel mogen — maak nu private en probeer opnieuw
        var loaded = await db.Sets.FindAsync(set.Id);
        loaded!.IsPublic = false;
        await db.SaveChangesAsync();

        var service = new SetForkService(db);
        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.CopySetAsync(set.Id, randomUserId));
    }

    [Fact]
    public async Task CopySetAsync_StaatToeAanGeabonneerdeOpPriveSet()
    {
        using var db = NewDb();
        var (_, subscriber, set) = await SeedSharedSetAsync(db);

        // Maak de set private — subscriber heeft een subscription, dus toegang blijft
        var loaded = await db.Sets.FindAsync(set.Id);
        loaded!.IsPublic = false;
        await db.SaveChangesAsync();

        var service = new SetForkService(db);
        var copy = await service.CopySetAsync(set.Id, subscriber.Id);

        Assert.NotNull(copy);
        Assert.Equal(subscriber.Id, copy.UserId);
        var copyWords = await db.SetWords.Where(sw => sw.SetId == copy.Id).Include(sw => sw.Word).ToListAsync();
        Assert.Equal(2, copyWords.Count);
    }

    [Fact]
    public async Task CopySetAsync_GeeftNieuweNummersAanDieNietBotsen()
    {
        using var db = NewDb();
        var (owner, subscriber, set) = await SeedSharedSetAsync(db);

        // Subscriber heeft al een eigen Latijns woord met Number = 100
        db.Words.Add(new Word
        {
            Id = Guid.NewGuid(),
            UserId = subscriber.Id,
            Number = 100,
            Language = Language.Latin,
            Term = "existens",
            Translation = "bestaand"
        });
        await db.SaveChangesAsync();

        var service = new SetForkService(db);
        var copy = await service.CopySetAsync(set.Id, subscriber.Id);

        var copyWords = await db.SetWords
            .Where(sw => sw.SetId == copy.Id)
            .Include(sw => sw.Word)
            .ToListAsync();

        Assert.Equal(2, copyWords.Count);

        // Alle gekopieerde nummers moeten boven 100 liggen
        Assert.All(copyWords, sw => Assert.True(sw.Word.Number > 100,
            $"Verwacht Number > 100, maar was {sw.Word.Number}"));

        // Nummers moeten uniek zijn onder alle woorden van de subscriber
        var allSubscriberNumbers = await db.Words
            .Where(w => w.UserId == subscriber.Id && w.Language == Language.Latin)
            .Select(w => w.Number)
            .ToListAsync();
        Assert.Equal(allSubscriberNumbers.Count, allSubscriberNumbers.Distinct().Count());
    }

    // Helper om eigen set met N woorden te seeden
    private static async Task<(ApplicationUser user, Set set, List<Word> words)> SeedOwnedSetAsync(AppDbContext db, int wordCount = 4)
    {
        var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = "u", DisplayName = "U" };
        db.Users.Add(user);
        var words = new List<Word>();
        for (int i = 1; i <= wordCount; i++)
        {
            var w = new Word { Id = Guid.NewGuid(), UserId = user.Id, Number = i, Language = Language.Latin, Term = $"w{i}", Translation = $"v{i}" };
            words.Add(w);
            db.Words.Add(w);
        }
        var set = new Set { Id = Guid.NewGuid(), UserId = user.Id, Name = "A", Language = Language.Latin };
        foreach (var w in words) set.SetWords.Add(new SetWord { SetId = set.Id, WordId = w.Id });
        db.Sets.Add(set);
        await db.SaveChangesAsync();
        return (user, set, words);
    }

    [Fact]
    public async Task SplitSetAsync_MoveVerplaatstWoordenNaarNieuweSet()
    {
        using var db = NewDb();
        var (user, src, words) = await SeedOwnedSetAsync(db, 4);
        var service = new SetForkService(db);
        var ids = words.Take(2).Select(w => w.Id).ToList();

        var newSet = await service.SplitSetAsync(src.Id, user.Id, "B", ids, mode: "move");

        Assert.Equal(user.Id, newSet.UserId);
        Assert.Equal("B", newSet.Name);
        Assert.Equal(Language.Latin, newSet.Language);
        var srcCount = await db.SetWords.CountAsync(sw => sw.SetId == src.Id);
        var newCount = await db.SetWords.CountAsync(sw => sw.SetId == newSet.Id);
        Assert.Equal(2, srcCount);
        Assert.Equal(2, newCount);
    }

    [Fact]
    public async Task SplitSetAsync_CopyLaatBronOngewijzigd()
    {
        using var db = NewDb();
        var (user, src, words) = await SeedOwnedSetAsync(db, 4);
        var service = new SetForkService(db);
        var ids = words.Take(2).Select(w => w.Id).ToList();

        var newSet = await service.SplitSetAsync(src.Id, user.Id, "B", ids, mode: "copy");

        var srcCount = await db.SetWords.CountAsync(sw => sw.SetId == src.Id);
        var newCount = await db.SetWords.CountAsync(sw => sw.SetId == newSet.Id);
        Assert.Equal(4, srcCount);
        Assert.Equal(2, newCount);
    }

    [Fact]
    public async Task SplitSetAsync_WeigertNietEigenaar()
    {
        using var db = NewDb();
        var (user, src, words) = await SeedOwnedSetAsync(db);
        var service = new SetForkService(db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.SplitSetAsync(src.Id, Guid.NewGuid(), "B", words.Take(1).Select(w => w.Id).ToList(), "copy"));
    }

    [Fact]
    public async Task SplitSetAsync_WeigertLegeWordIds()
    {
        using var db = NewDb();
        var (user, src, _) = await SeedOwnedSetAsync(db);
        var service = new SetForkService(db);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.SplitSetAsync(src.Id, user.Id, "B", new List<Guid>(), "copy"));
    }
}
