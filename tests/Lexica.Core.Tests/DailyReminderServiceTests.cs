using Lexica.Core.Entities;
using Lexica.Core.Enums;
using Lexica.Infrastructure.Data;
using Lexica.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Lexica.Core.Tests;

public class DailyReminderServiceTests
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.UtcNow);
    private static readonly TimeOnly LateEvening = new(23, 0); // voorbij beide standaardtijdstippen

    private static AppDbContext NewDb([System.Runtime.CompilerServices.CallerMemberName] string name = "")
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"test-{name}-{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(options);
    }

    /// <summary>Captureert naar welke gebruikers (via hun subscription) een push zou gaan.</summary>
    private sealed class FakeSender : IPushSender
    {
        public readonly List<Guid> NotifiedUserIds = new();

        public Task SendAsync(PushSubscription subscription, string payloadJson, CancellationToken ct = default)
        {
            NotifiedUserIds.Add(subscription.UserId);
            return Task.CompletedTask;
        }
    }

    private static ApplicationUser AddUser(AppDbContext db, bool daily = true, bool nudge = true, DateTime? lastSession = null)
    {
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = $"u-{Guid.NewGuid():N}",
            DailyReminderEnabled = daily,
            EveningNudgeEnabled = nudge,
            LastSessionDate = lastSession
        };
        db.Users.Add(user);
        return user;
    }

    private static void AddSubscription(AppDbContext db, Guid userId)
        => db.PushSubscriptions.Add(new PushSubscription
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Endpoint = $"https://push.example/{Guid.NewGuid()}",
            P256dh = "key",
            Auth = "auth"
        });

    private static void AddDueWord(AppDbContext db, Guid userId)
    {
        var word = new Word { Id = Guid.NewGuid(), UserId = userId, Number = 1, Language = Language.Latin, Term = "amare", Translation = "houden van" };
        db.Words.Add(word);
        db.UserWordProgress.Add(new UserWordProgress
        {
            UserId = userId,
            WordId = word.Id,
            DueDate = DateTime.UtcNow.Date.AddDays(-1) // overdue
        });
    }

    [Fact]
    public async Task DailyReminder_only_to_subscribed_users_with_due_words_and_reminder_enabled()
    {
        using var db = NewDb();

        var willNotify = AddUser(db, daily: true);                 // ✓ alles ok
        var reminderOff = AddUser(db, daily: false);               // ✗ herinnering uit
        var noSub = AddUser(db, daily: true);                      // ✗ geen abonnement
        var noDue = AddUser(db, daily: true);                      // ✗ geen due woord

        AddSubscription(db, willNotify.Id);
        AddSubscription(db, reminderOff.Id);
        AddSubscription(db, noDue.Id);

        AddDueWord(db, willNotify.Id);
        AddDueWord(db, reminderOff.Id);
        AddDueWord(db, noSub.Id);
        await db.SaveChangesAsync();

        var sender = new FakeSender();
        var service = new DailyReminderService(db, sender, NullLogger<DailyReminderService>.Instance);

        await service.SendDailyRemindersAsync(Today, LateEvening);

        Assert.Equal(new[] { willNotify.Id }, sender.NotifiedUserIds);
    }

    [Fact]
    public async Task EveningNudge_skips_users_who_already_practiced_today()
    {
        using var db = NewDb();

        var notPracticed = AddUser(db, nudge: true, lastSession: DateTime.UtcNow.Date.AddDays(-1)); // ✓
        var practicedToday = AddUser(db, nudge: true, lastSession: DateTime.UtcNow.Date);            // ✗ al geoefend
        var nudgeOff = AddUser(db, nudge: false, lastSession: null);                                 // ✗ nudge uit

        AddSubscription(db, notPracticed.Id);
        AddSubscription(db, practicedToday.Id);
        AddSubscription(db, nudgeOff.Id);

        AddDueWord(db, notPracticed.Id);
        AddDueWord(db, practicedToday.Id);
        AddDueWord(db, nudgeOff.Id);
        await db.SaveChangesAsync();

        var sender = new FakeSender();
        var service = new DailyReminderService(db, sender, NullLogger<DailyReminderService>.Instance);

        await service.SendEveningNudgesAsync(Today, LateEvening);

        Assert.Equal(new[] { notPracticed.Id }, sender.NotifiedUserIds);
    }

    [Fact]
    public async Task DailyReminder_not_sent_before_users_chosen_time()
    {
        using var db = NewDb();

        var user = AddUser(db, daily: true);
        user.DailyReminderTime = new TimeOnly(18, 0);
        AddSubscription(db, user.Id);
        AddDueWord(db, user.Id);
        await db.SaveChangesAsync();

        var sender = new FakeSender();
        var service = new DailyReminderService(db, sender, NullLogger<DailyReminderService>.Instance);

        await service.SendDailyRemindersAsync(Today, new TimeOnly(17, 30)); // nog vóór het gekozen uur
        Assert.Empty(sender.NotifiedUserIds);

        await service.SendDailyRemindersAsync(Today, new TimeOnly(18, 0)); // op tijd
        Assert.Equal(new[] { user.Id }, sender.NotifiedUserIds);
    }

    [Fact]
    public async Task DailyReminder_sent_at_most_once_per_day_per_user()
    {
        using var db = NewDb();

        var user = AddUser(db, daily: true);
        AddSubscription(db, user.Id);
        AddDueWord(db, user.Id);
        await db.SaveChangesAsync();

        var sender = new FakeSender();
        var service = new DailyReminderService(db, sender, NullLogger<DailyReminderService>.Instance);

        await service.SendDailyRemindersAsync(Today, LateEvening);
        await service.SendDailyRemindersAsync(Today, LateEvening); // tweede tick dezelfde dag

        Assert.Equal(new[] { user.Id }, sender.NotifiedUserIds); // dedup: maar één melding
    }
}
