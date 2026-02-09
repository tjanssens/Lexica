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

        // Get word IDs in selected groups
        var groupWordIds = await db.GroupWords
            .Where(gw => request.GroupIds.Contains(gw.GroupId))
            .Select(gw => gw.WordId)
            .Distinct()
            .ToListAsync();

        // Get words for the session
        var words = await db.Words
            .Where(w => w.UserId == UserId && groupWordIds.Contains(w.Id))
            .ToListAsync();

        // Priority selection
        var overdue = words.Where(w => w.DueDate < today).OrderBy(w => w.DueDate).ToList();
        var dueToday = words.Where(w => w.DueDate == today).ToList();
        var newWords = words.Where(w => w.Repetitions == 0 && w.DueDate >= today).ToList();

        var selected = new List<Word>();
        selected.AddRange(overdue.Take(sessionSize));

        if (selected.Count < sessionSize)
            selected.AddRange(dueToday.Take(sessionSize - selected.Count));

        if (selected.Count < sessionSize)
            selected.AddRange(newWords.Take(sessionSize - selected.Count));

        var result = selected.Select(w => new SessionWordDto(
            w.Id, w.Term, w.Translation, w.PartOfSpeech, w.Notes,
            w.Repetitions == 0
        )).ToList();

        return Ok(result);
    }

    [HttpPost("review")]
    public async Task<ActionResult<ReviewResponse>> Review(ReviewRequest request)
    {
        var word = await db.Words.FirstOrDefaultAsync(w => w.Id == request.WordId && w.UserId == UserId);
        if (word == null) return NotFound();

        if (!Enum.TryParse<ReviewResult>(request.Result, true, out var result))
            return BadRequest("Ongeldig resultaat.");
        if (!Enum.TryParse<Direction>(request.Direction, true, out var direction))
            return BadRequest("Ongeldige richting.");

        var easinessBefore = word.Easiness;

        // SM-2 calculation
        var (newEasiness, newInterval, newRepetitions, newDueDate) =
            Sm2Service.Calculate(word.Easiness, word.Interval, word.Repetitions, result);

        word.Easiness = newEasiness;
        word.Interval = newInterval;
        word.Repetitions = newRepetitions;
        word.DueDate = newDueDate;
        word.LastReviewed = DateTime.UtcNow;
        word.TimesReviewed++;

        // Log the review
        db.ReviewLogs.Add(new ReviewLog
        {
            Id = Guid.NewGuid(),
            WordId = word.Id,
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
            ReviewResult.Known => word.Easiness < 2.0 ? 15 : 10,
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
