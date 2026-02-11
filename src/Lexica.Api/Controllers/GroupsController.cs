using System.Security.Claims;
using Lexica.Core.Entities;
using Lexica.Core.Enums;
using Lexica.Infrastructure.Data;
using Lexica.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Lexica.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GroupsController(AppDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<List<GroupDto>>> GetAll([FromQuery] string? language)
    {
        var query = db.Groups.Where(g => g.UserId == UserId);

        if (!string.IsNullOrEmpty(language) && Enum.TryParse<Language>(language, true, out var lang))
            query = query.Where(g => g.Language == lang);

        var groups = await query
            .Select(g => new GroupDto(
                g.Id, g.Name, g.Language.ToString(), g.DefaultDirection.ToString(),
                g.GroupWords.Count,
                g.GroupWords.Count(gw => gw.Word.UserProgress
                    .Any(p => p.UserId == UserId && p.Repetitions > 5 && p.Easiness > 2.3 && p.Interval > 21)),
                g.GroupWords.Count(gw => gw.Word.UserProgress
                    .Any(p => p.UserId == UserId && p.Repetitions > 0 &&
                        !(p.Repetitions > 5 && p.Easiness > 2.3 && p.Interval > 21))),
                g.CreatedAt))
            .ToListAsync();

        return Ok(groups);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<GroupDto>> Get(Guid id)
    {
        var g = await db.Groups
            .Where(g => g.Id == id && g.UserId == UserId)
            .Select(g => new GroupDto(
                g.Id, g.Name, g.Language.ToString(), g.DefaultDirection.ToString(),
                g.GroupWords.Count,
                g.GroupWords.Count(gw => gw.Word.UserProgress
                    .Any(p => p.UserId == UserId && p.Repetitions > 5 && p.Easiness > 2.3 && p.Interval > 21)),
                g.GroupWords.Count(gw => gw.Word.UserProgress
                    .Any(p => p.UserId == UserId && p.Repetitions > 0 &&
                        !(p.Repetitions > 5 && p.Easiness > 2.3 && p.Interval > 21))),
                g.CreatedAt))
            .FirstOrDefaultAsync();
        if (g == null) return NotFound();

        return Ok(g);
    }

    [HttpPost]
    public async Task<ActionResult<GroupDto>> Create(CreateGroupRequest request)
    {
        if (!Enum.TryParse<Language>(request.Language, true, out var lang))
            return BadRequest("Ongeldige taal.");
        if (!Enum.TryParse<Direction>(request.DefaultDirection, true, out var dir))
            dir = Direction.NlToTarget;

        var group = new Group
        {
            Id = Guid.NewGuid(),
            UserId = UserId,
            Name = request.Name,
            Language = lang,
            DefaultDirection = dir
        };

        db.Groups.Add(group);

        // Add words by number range if specified
        if (request.FromNumber.HasValue && request.ToNumber.HasValue)
        {
            var words = await db.Words
                .Where(w => w.UserId == UserId && w.Language == lang
                    && w.Number >= request.FromNumber.Value
                    && w.Number <= request.ToNumber.Value)
                .Select(w => w.Id)
                .ToListAsync();

            foreach (var wordId in words)
                group.GroupWords.Add(new GroupWord { GroupId = group.Id, WordId = wordId });
        }

        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = group.Id }, new GroupDto(
            group.Id, group.Name, group.Language.ToString(), group.DefaultDirection.ToString(),
            group.GroupWords.Count, 0, 0, group.CreatedAt));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<GroupDto>> Update(Guid id, UpdateGroupRequest request)
    {
        var group = await db.Groups
            .Where(g => g.Id == id && g.UserId == UserId)
            .Select(g => new GroupDto(
                g.Id, g.Name, g.Language.ToString(), g.DefaultDirection.ToString(),
                g.GroupWords.Count,
                g.GroupWords.Count(gw => gw.Word.UserProgress
                    .Any(p => p.UserId == UserId && p.Repetitions > 5 && p.Easiness > 2.3 && p.Interval > 21)),
                g.GroupWords.Count(gw => gw.Word.UserProgress
                    .Any(p => p.UserId == UserId && p.Repetitions > 0 &&
                        !(p.Repetitions > 5 && p.Easiness > 2.3 && p.Interval > 21))),
                g.CreatedAt))
            .FirstOrDefaultAsync();
        if (group == null) return NotFound();

        var entity = await db.Groups.FindAsync(id);
        if (request.Name != null) entity!.Name = request.Name;
        if (request.DefaultDirection != null && Enum.TryParse<Direction>(request.DefaultDirection, true, out var dir))
            entity!.DefaultDirection = dir;

        await db.SaveChangesAsync();

        return Ok(group);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var group = await db.Groups.FirstOrDefaultAsync(g => g.Id == id && g.UserId == UserId);
        if (group == null) return NotFound();

        db.Groups.Remove(group);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:guid}/words")]
    public async Task<ActionResult<List<WordDto>>> GetWords(Guid id)
    {
        var group = await db.Groups.FirstOrDefaultAsync(g => g.Id == id && g.UserId == UserId);
        if (group == null) return NotFound();

        var words = await db.GroupWords
            .Where(gw => gw.GroupId == id)
            .Select(gw => gw.Word)
            .Where(w => w.UserId == UserId)
            .OrderBy(w => w.Number)
            .Select(w => new WordDto(
                w.Id, w.Number, w.Language.ToString(), w.Term, w.Translation,
                w.PartOfSpeech,
                w.UserProgress.Where(p => p.UserId == UserId).Select(p => p.Notes).FirstOrDefault(),
                w.UserProgress.Where(p => p.UserId == UserId).Select(p => p.Easiness).FirstOrDefault(),
                w.UserProgress.Where(p => p.UserId == UserId).Select(p => p.Interval).FirstOrDefault(),
                w.UserProgress.Where(p => p.UserId == UserId).Select(p => p.Repetitions).FirstOrDefault(),
                w.UserProgress.Where(p => p.UserId == UserId).Select(p => p.DueDate).FirstOrDefault(),
                w.UserProgress.Where(p => p.UserId == UserId).Select(p => p.LastReviewed).FirstOrDefault(),
                w.UserProgress.Where(p => p.UserId == UserId).Select(p => p.TimesReviewed).FirstOrDefault()))
            .ToListAsync();

        return Ok(words);
    }

    [HttpPost("{id:guid}/words")]
    public async Task<IActionResult> AddWords(Guid id, AddWordsToGroupRequest request)
    {
        var group = await db.Groups.Include(g => g.GroupWords)
            .FirstOrDefaultAsync(g => g.Id == id && g.UserId == UserId);
        if (group == null) return NotFound();

        var wordIds = new List<Guid>();

        if (request.WordIds?.Count > 0)
        {
            wordIds = request.WordIds;
        }
        else if (request.FromNumber.HasValue && request.ToNumber.HasValue)
        {
            wordIds = await db.Words
                .Where(w => w.UserId == UserId && w.Language == group.Language
                    && w.Number >= request.FromNumber.Value
                    && w.Number <= request.ToNumber.Value)
                .Select(w => w.Id)
                .ToListAsync();
        }

        var existingWordIds = group.GroupWords.Select(gw => gw.WordId).ToHashSet();
        foreach (var wordId in wordIds.Where(wid => !existingWordIds.Contains(wid)))
        {
            db.GroupWords.Add(new GroupWord { GroupId = group.Id, WordId = wordId });
        }

        await db.SaveChangesAsync();
        return Ok(new { Added = wordIds.Count(wid => !existingWordIds.Contains(wid)) });
    }

    [HttpDelete("{id:guid}/words")]
    public async Task<IActionResult> RemoveWords(Guid id, [FromBody] List<Guid> wordIds)
    {
        var groupWords = await db.GroupWords
            .Where(gw => gw.GroupId == id && wordIds.Contains(gw.WordId))
            .ToListAsync();

        db.GroupWords.RemoveRange(groupWords);
        await db.SaveChangesAsync();
        return Ok(new { Removed = groupWords.Count });
    }
}
