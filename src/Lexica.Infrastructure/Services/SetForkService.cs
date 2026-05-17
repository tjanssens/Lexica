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

        foreach (var sw in source.SetWords)
        {
            var src = sw.Word;
            var newWord = new Word
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Number = src.Number,
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
}
