using System.Security.Claims;
using Lexica.Core.Entities;
using Lexica.Infrastructure.Data;
using Lexica.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Lexica.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StatsController(AppDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<UserStatsDto>> GetStats()
    {
        var user = await db.Users.FindAsync(UserId);
        if (user == null) return NotFound();

        var today = DateTime.UtcNow.Date;

        var totalWords = await db.Words.CountAsync(w => w.UserId == UserId);
        var masteredWords = await db.Words.CountAsync(w =>
            w.UserId == UserId && w.Repetitions > 5 && w.Easiness > 2.3 && w.Interval > 21);
        var dueToday = await db.Words.CountAsync(w =>
            w.UserId == UserId && w.DueDate <= today);

        var achievements = await db.Achievements
            .Where(a => a.UserId == UserId)
            .Select(a => new AchievementDto(a.Type, GetAchievementTitle(a.Type), a.UnlockedAt))
            .ToListAsync();

        var (levelTitle, xpForNext) = GetLevelInfo(user.Level);

        return Ok(new UserStatsDto(
            user.Xp,
            user.Level,
            levelTitle,
            xpForNext,
            user.Streak,
            user.StreakFreezeAvailable,
            totalWords,
            masteredWords,
            dueToday,
            achievements
        ));
    }

    private static (string Title, int XpForNext) GetLevelInfo(int level)
    {
        var title = level switch
        {
            <= 10 => "Tiro",
            <= 20 => "Legionarius",
            <= 30 => "Centurio",
            <= 40 => "Tribunus",
            <= 50 => "Legatus",
            _ => "Consul"
        };

        var xpPerLevel = level switch
        {
            <= 10 => 500,
            <= 20 => 1000,
            <= 30 => 2000,
            <= 40 => 3500,
            <= 50 => 5000,
            _ => 7500
        };

        return (title, xpPerLevel);
    }

    private static string GetAchievementTitle(string type) => type switch
    {
        "first_steps" => "Primus Passus",
        "100_words" => "Centurio Verborum",
        "1000_words" => "Mille Verba",
        "perfectionist" => "Perfectus",
        "comeback" => "Redux",
        "night_owl" => "Noctua",
        "early_bird" => "Aurora",
        "30_days" => "Marcus Aurelius",
        "100_days" => "Cicero",
        _ => type
    };
}
