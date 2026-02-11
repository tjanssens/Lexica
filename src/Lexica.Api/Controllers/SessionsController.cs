using System.Security.Claims;
using Lexica.Core.Entities;
using Lexica.Core.Enums;
using Lexica.Core.Services;
using Lexica.Infrastructure.Data;
using Lexica.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Lexica.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SessionsController(AppDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost("next")]
    public async Task<ActionResult<List<SessionWordDto>>> GetNextSession(SessionRequest request)
    {
        var sessionSize = request.SessionSize ?? 20;
        var today = DateTime.UtcNow.Date;

        // Only allow sets the user owns or is subscribed to
        var allowedSetIds = await db.Sets
            .Where(s => request.SetIds.Contains(s.Id) &&
                (s.UserId == UserId || s.Subscriptions.Any(sub => sub.UserId == UserId)))
            .Select(s => s.Id)
            .ToListAsync();

        // Get word IDs in selected sets
        var setWordIds = await db.SetWords
            .Where(sw => allowedSetIds.Contains(sw.SetId))
            .Select(sw => sw.WordId)
            .Distinct()
            .ToListAsync();

        // Get words with their progress for the session (no UserId filter: shared sets have words owned by others)
        var wordsWithProgress = await db.Words
            .Where(w => setWordIds.Contains(w.Id))
            .Select(w => new
            {
                Word = w,
                Progress = w.UserProgress.FirstOrDefault(p => p.UserId == UserId)
            })
            .ToListAsync();

        // Priority selection
        var overdue = wordsWithProgress
            .Where(wp => (wp.Progress?.DueDate ?? today) < today)
            .OrderBy(wp => wp.Progress!.DueDate).ToList();
        var dueToday = wordsWithProgress
            .Where(wp => (wp.Progress?.DueDate ?? today) == today && (wp.Progress?.Repetitions ?? 0) > 0).ToList();
        var newWords = wordsWithProgress
            .Where(wp => (wp.Progress?.Repetitions ?? 0) == 0 && (wp.Progress?.DueDate ?? today) >= today).ToList();

        var selected = new List<dynamic>();
        selected.AddRange(overdue.Take(sessionSize));

        if (selected.Count < sessionSize)
            selected.AddRange(dueToday.Take(sessionSize - selected.Count));

        if (selected.Count < sessionSize)
            selected.AddRange(newWords.Take(sessionSize - selected.Count));

        var result = selected.Select(wp => new SessionWordDto(
            ((Word)wp.Word).Id, ((Word)wp.Word).Term, ((Word)wp.Word).Translation,
            ((Word)wp.Word).PartOfSpeech,
            ((UserWordProgress?)wp.Progress)?.Notes,
            ((UserWordProgress?)wp.Progress)?.Repetitions == 0 || wp.Progress == null
        )).ToList();

        return Ok(result);
    }

    [HttpPost("review")]
    public async Task<ActionResult<ReviewResponse>> Review(ReviewRequest request)
    {
        // Allow reviewing own words or words in subscribed sets
        var word = await db.Words.FirstOrDefaultAsync(w => w.Id == request.WordId &&
            (w.UserId == UserId || w.SetWords.Any(sw => sw.Set.Subscriptions.Any(sub => sub.UserId == UserId))));
        if (word == null) return NotFound();

        if (!Enum.TryParse<ReviewResult>(request.Result, true, out var result))
            return BadRequest("Ongeldig resultaat.");
        if (!Enum.TryParse<Direction>(request.Direction, true, out var direction))
            return BadRequest("Ongeldige richting.");

        var progress = await db.UserWordProgress
            .FirstOrDefaultAsync(p => p.UserId == UserId && p.WordId == request.WordId);
        if (progress == null)
        {
            progress = new UserWordProgress { UserId = UserId, WordId = request.WordId };
            db.UserWordProgress.Add(progress);
        }

        var easinessBefore = progress.Easiness;

        // SM-2 calculation
        var (newEasiness, newInterval, newRepetitions, newDueDate) =
            Sm2Service.Calculate(progress.Easiness, progress.Interval, progress.Repetitions, result);

        progress.Easiness = newEasiness;
        progress.Interval = newInterval;
        progress.Repetitions = newRepetitions;
        progress.DueDate = newDueDate;
        progress.LastReviewed = DateTime.UtcNow;
        progress.TimesReviewed++;

        // Log the review
        db.ReviewLogs.Add(new ReviewLog
        {
            Id = Guid.NewGuid(),
            WordId = word.Id,
            UserId = UserId,
            Direction = direction,
            Result = result,
            EasinessBefore = easinessBefore,
            EasinessAfter = newEasiness,
            IntervalAfter = newInterval
        });

        // XP calculation
        int xp = result switch
        {
            ReviewResult.Unknown => 2,
            ReviewResult.Known => progress.Easiness < 2.0 ? 15 : 10,
            ReviewResult.Easy => 15,
            _ => 0
        };

        // Update user XP
        var user = await db.Users.FindAsync(UserId);
        if (user != null)
        {
            user.Xp += xp;
            user.Level = CalculateLevel(user.Xp);
        }

        await db.SaveChangesAsync();

        return Ok(new ReviewResponse(word.Id, newEasiness, newInterval, newDueDate, xp));
    }

    private static int CalculateLevel(int xp)
    {
        if (xp < 5000) return xp / 500 + 1;       // Level 1-10: 500 XP each
        if (xp < 15000) return (xp - 5000) / 1000 + 11; // Level 11-20: 1000 XP each
        if (xp < 35000) return (xp - 15000) / 2000 + 21; // Level 21-30: 2000 XP each
        if (xp < 70000) return (xp - 35000) / 3500 + 31; // Level 31-40: 3500 XP each
        if (xp < 120000) return (xp - 70000) / 5000 + 41; // Level 41-50: 5000 XP each
        return (xp - 120000) / 7500 + 51;            // Level 51+: 7500 XP each
    }
}
