using Lexica.Core.Entities;
using Lexica.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Lexica.Infrastructure.Services;

public class SetForkService(AppDbContext db)
{
    /// <summary>
    /// Diepe kopie van een set (Set + Words + SetWords + UserWordProgress) naar de huidige gebruiker.
    /// Zegt automatisch de subscription op het origineel op.
    /// </summary>
    public async Task<Set> CopySetAsync(Guid setId, Guid userId)
    {
        var source = await db.Sets
            .Include(s => s.User)
            .Include(s => s.SetWords).ThenInclude(sw => sw.Word)
            .FirstOrDefaultAsync(s =>
                s.Id == setId &&
                (s.IsPublic || s.Subscriptions.Any(sub => sub.UserId == userId)));

        if (source == null) throw new KeyNotFoundException("Set niet gevonden of geen toegang.");
        if (source.UserId == userId) throw new InvalidOperationException("Je bent al eigenaar van deze set.");

        var sourceWordIds = source.SetWords.Select(sw => sw.WordId).ToList();

        // Bestaande progress van de huidige user op deze bron-woorden
        var existingProgress = await db.UserWordProgress
            .Where(p => p.UserId == userId && sourceWordIds.Contains(p.WordId))
            .ToDictionaryAsync(p => p.WordId);

        // Bepaal het hoogste bestaande Number van de subscriber voor deze taal, zodat
        // gekopieerde woorden geen botsing veroorzaken op de unieke index (UserId, Language, Number).
        var maxNumber = await db.Words
            .Where(w => w.UserId == userId && w.Language == source.Language)
            .Select(w => (int?)w.Number)
            .MaxAsync() ?? 0;
        var nextNumber = maxNumber + 1;

        var newSet = new Set
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = source.Name,
            Language = source.Language,
            DefaultDirection = source.DefaultDirection,
            IsPublic = false,
            Description = source.Description,
            CreatedAt = DateTime.UtcNow
        };
        db.Sets.Add(newSet);

        foreach (var sw in source.SetWords.OrderBy(sw => sw.Word.Number))
        {
            var src = sw.Word;
            var newWord = new Word
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Number = nextNumber++,
                Language = src.Language,
                Term = src.Term,
                Translation = src.Translation,
                PartOfSpeech = src.PartOfSpeech,
                SourceWordId = src.Id,
                OriginalAuthorDisplayName = source.User.DisplayName,
                CreatedAt = DateTime.UtcNow
            };
            db.Words.Add(newWord);
            db.SetWords.Add(new SetWord { SetId = newSet.Id, WordId = newWord.Id });

            if (existingProgress.TryGetValue(src.Id, out var prog))
            {
                db.UserWordProgress.Add(new UserWordProgress
                {
                    UserId = userId,
                    WordId = newWord.Id,
                    Easiness = prog.Easiness,
                    Interval = prog.Interval,
                    Repetitions = prog.Repetitions,
                    DueDate = prog.DueDate,
                    LastReviewed = prog.LastReviewed,
                    TimesReviewed = prog.TimesReviewed,
                    Notes = prog.Notes
                });
            }
        }

        // Zeg subscription automatisch op
        var sub = await db.SetSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.SetId == setId);
        if (sub != null) db.SetSubscriptions.Remove(sub);

        await db.SaveChangesAsync();
        return newSet;
    }

    /// <summary>
    /// Maakt een nieuwe set met de opgegeven woorden uit een eigen bron-set.
    /// mode = "move" verwijdert de SetWord-koppelingen uit de bron; "copy" laat ze staan.
    /// </summary>
    public async Task<Set> SplitSetAsync(Guid sourceSetId, Guid userId, string newSetName, List<Guid> wordIds, string mode)
    {
        if (wordIds == null || wordIds.Count == 0) throw new ArgumentException("Selecteer minstens één woord.");
        if (mode != "move" && mode != "copy") throw new ArgumentException("Mode moet 'move' of 'copy' zijn.");

        var source = await db.Sets
            .Include(s => s.SetWords)
            .FirstOrDefaultAsync(s => s.Id == sourceSetId);
        if (source == null) throw new KeyNotFoundException("Bron-set niet gevonden.");
        if (source.UserId != userId) throw new UnauthorizedAccessException("Niet je eigen set.");

        var newSet = new Set
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = newSetName,
            Language = source.Language,
            DefaultDirection = source.DefaultDirection,
            CreatedAt = DateTime.UtcNow
        };
        db.Sets.Add(newSet);

        var requested = wordIds.ToHashSet();
        foreach (var sw in source.SetWords.Where(sw => requested.Contains(sw.WordId)))
        {
            db.SetWords.Add(new SetWord { SetId = newSet.Id, WordId = sw.WordId });
            if (mode == "move") db.SetWords.Remove(sw);
        }

        await db.SaveChangesAsync();
        return newSet;
    }

    /// <summary>
    /// Voegt meerdere eigen sets samen tot één nieuwe set.
    /// Alle sets moeten van de gebruiker zijn en dezelfde taal hebben.
    /// </summary>
    public async Task<Set> MergeSetsAsync(Guid userId, string newSetName, List<Guid> setIds, bool deleteOriginals)
    {
        if (setIds == null || setIds.Count < 2) throw new ArgumentException("Selecteer minstens twee sets.");

        var sets = await db.Sets
            .Include(s => s.SetWords)
            .Where(s => setIds.Contains(s.Id))
            .ToListAsync();
        if (sets.Count != setIds.Count) throw new KeyNotFoundException("Eén of meer sets niet gevonden.");
        if (sets.Any(s => s.UserId != userId)) throw new UnauthorizedAccessException("Niet je eigen set.");

        var languages = sets.Select(s => s.Language).Distinct().ToList();
        if (languages.Count > 1) throw new InvalidOperationException("Sets moeten dezelfde taal hebben.");

        var first = sets.First();
        var merged = new Set
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = newSetName,
            Language = first.Language,
            DefaultDirection = first.DefaultDirection,
            CreatedAt = DateTime.UtcNow
        };
        db.Sets.Add(merged);

        var seen = new HashSet<Guid>();
        foreach (var sw in sets.SelectMany(s => s.SetWords))
        {
            if (seen.Add(sw.WordId))
                db.SetWords.Add(new SetWord { SetId = merged.Id, WordId = sw.WordId });
        }

        if (deleteOriginals)
        {
            // Subscriptions op te verwijderen sets ook weg
            var subs = await db.SetSubscriptions.Where(s => setIds.Contains(s.SetId)).ToListAsync();
            db.SetSubscriptions.RemoveRange(subs);
            db.Sets.RemoveRange(sets);
        }

        await db.SaveChangesAsync();
        return merged;
    }
}
