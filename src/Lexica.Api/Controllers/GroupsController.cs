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
                g.GroupWords.Count(gw => gw.Word.Repetitions > 5 && gw.Word.Easiness > 2.3 && gw.Word.Interval > 21),
                g.GroupWords.Count(gw => gw.Word.Repetitions > 0 && !(gw.Word.Repetitions > 5 && gw.Word.Easiness > 2.3 && gw.Word.Interval > 21)),
                g.CreatedAt))
            .ToListAsync();

        return Ok(groups);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<GroupDto>> Get(Guid id)
    {
        var g = await db.Groups.Include(g => g.GroupWords).ThenInclude(gw => gw.Word)
            .FirstOrDefaultAsync(g => g.Id == id && g.UserId == UserId);
        if (g == null) return NotFound();

        return Ok(new GroupDto(
            g.Id, g.Name, g.Language.ToString(), g.DefaultDirection.ToString(),
            g.GroupWords.Count,
            g.GroupWords.Count(gw => gw.Word.Repetitions > 5 && gw.Word.Easiness > 2.3 && gw.Word.Interval > 21),
            g.GroupWords.Count(gw => gw.Word.Repetitions > 0 && !(gw.Word.Repetitions > 5 && gw.Word.Easiness > 2.3 && gw.Word.Interval > 21)),
            g.CreatedAt));
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
        var group = await db.Groups.Include(g => g.GroupWords).ThenInclude(gw => gw.Word)
            .FirstOrDefaultAsync(g => g.Id == id && g.UserId == UserId);
        if (group == null) return NotFound();

        if (request.Name != null) group.Name = request.Name;
        if (request.DefaultDirection != null && Enum.TryParse<Direction>(request.DefaultDirection, true, out var dir))
            group.DefaultDirection = dir;

        await db.SaveChangesAsync();

        return Ok(new GroupDto(
            group.Id, group.Name, group.Language.ToString(), group.DefaultDirection.ToString(),
            group.GroupWords.Count,
            group.GroupWords.Count(gw => gw.Word.Repetitions > 5 && gw.Word.Easiness > 2.3 && gw.Word.Interval > 21),
            group.GroupWords.Count(gw => gw.Word.Repetitions > 0 && !(gw.Word.Repetitions > 5 && gw.Word.Easiness > 2.3 && gw.Word.Interval > 21)),
            group.CreatedAt));
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
            .Join(db.Words, gw => gw.WordId, w => w.Id, (gw, w) => w)
            .Where(w => w.UserId == UserId)
            .OrderBy(w => w.Number)
            .Select(w => new WordDto(
                w.Id, w.Number, w.Language.ToString(), w.Term, w.Translation,
                w.PartOfSpeech, w.Notes, w.Easiness, w.Interval, w.Repetitions,
                w.DueDate, w.LastReviewed, w.TimesReviewed))
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
