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
public class SetsController(AppDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<List<SetDto>>> GetAll([FromQuery] string? language)
    {
        // Return owned + subscribed sets
        var query = db.Sets.Where(s =>
            s.UserId == UserId || s.Subscriptions.Any(sub => sub.UserId == UserId));

        if (!string.IsNullOrEmpty(language) && Enum.TryParse<Language>(language, true, out var lang))
            query = query.Where(s => s.Language == lang);

        var sets = await query
            .Select(s => new SetDto(
                s.Id, s.Name, s.Language.ToString(), s.DefaultDirection.ToString(),
                s.SetWords.Count,
                s.SetWords.Count(sw => sw.Word.UserProgress
                    .Any(p => p.UserId == UserId && p.Repetitions > 5 && p.Easiness > 2.3 && p.Interval > 21)),
                s.SetWords.Count(sw => sw.Word.UserProgress
                    .Any(p => p.UserId == UserId && p.Repetitions > 0 &&
                        !(p.Repetitions > 5 && p.Easiness > 2.3 && p.Interval > 21))),
                s.CreatedAt,
                s.IsPublic,
                s.Description,
                s.UserId == UserId,
                s.User.DisplayName,
                s.User.ProfilePictureUrl,
                s.Subscriptions.Count))
            .ToListAsync();

        return Ok(sets);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SetDto>> Get(Guid id)
    {
        var s = await db.Sets
            .Where(s => s.Id == id && (s.UserId == UserId || s.Subscriptions.Any(sub => sub.UserId == UserId)))
            .Select(s => new SetDto(
                s.Id, s.Name, s.Language.ToString(), s.DefaultDirection.ToString(),
                s.SetWords.Count,
                s.SetWords.Count(sw => sw.Word.UserProgress
                    .Any(p => p.UserId == UserId && p.Repetitions > 5 && p.Easiness > 2.3 && p.Interval > 21)),
                s.SetWords.Count(sw => sw.Word.UserProgress
                    .Any(p => p.UserId == UserId && p.Repetitions > 0 &&
                        !(p.Repetitions > 5 && p.Easiness > 2.3 && p.Interval > 21))),
                s.CreatedAt,
                s.IsPublic,
                s.Description,
                s.UserId == UserId,
                s.User.DisplayName,
                s.User.ProfilePictureUrl,
                s.Subscriptions.Count))
            .FirstOrDefaultAsync();
        if (s == null) return NotFound();

        return Ok(s);
    }

    [HttpPost]
    public async Task<ActionResult<SetDto>> Create(CreateSetRequest request)
    {
        if (!Enum.TryParse<Language>(request.Language, true, out var lang))
            return BadRequest("Ongeldige taal.");
        if (!Enum.TryParse<Direction>(request.DefaultDirection, true, out var dir))
            dir = Direction.NlToTarget;

        var set = new Set
        {
            Id = Guid.NewGuid(),
            UserId = UserId,
            Name = request.Name,
            Language = lang,
            DefaultDirection = dir
        };

        db.Sets.Add(set);

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
                set.SetWords.Add(new SetWord { SetId = set.Id, WordId = wordId });
        }

        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = set.Id }, new SetDto(
            set.Id, set.Name, set.Language.ToString(), set.DefaultDirection.ToString(),
            set.SetWords.Count, 0, 0, set.CreatedAt, false, null, true, null, null, 0));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<SetDto>> Update(Guid id, UpdateSetRequest request)
    {
        var set = await db.Sets.Include(s => s.SetWords)
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == UserId);
        if (set == null) return NotFound();

        if (request.Name != null) set.Name = request.Name;
        if (request.DefaultDirection != null && Enum.TryParse<Direction>(request.DefaultDirection, true, out var dir))
            set.DefaultDirection = dir;
        if (request.IsPublic.HasValue) set.IsPublic = request.IsPublic.Value;
        if (request.Description != null) set.Description = request.Description;

        await db.SaveChangesAsync();

        var subscriberCount = await db.SetSubscriptions.CountAsync(s => s.SetId == id);

        return Ok(new SetDto(
            set.Id, set.Name, set.Language.ToString(), set.DefaultDirection.ToString(),
            set.SetWords.Count,
            await db.SetWords.CountAsync(sw => sw.SetId == id && sw.Word.UserProgress
                .Any(p => p.UserId == UserId && p.Repetitions > 5 && p.Easiness > 2.3 && p.Interval > 21)),
            await db.SetWords.CountAsync(sw => sw.SetId == id && sw.Word.UserProgress
                .Any(p => p.UserId == UserId && p.Repetitions > 0 &&
                    !(p.Repetitions > 5 && p.Easiness > 2.3 && p.Interval > 21))),
            set.CreatedAt, set.IsPublic, set.Description, true, null, null, subscriberCount));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var set = await db.Sets.FirstOrDefaultAsync(s => s.Id == id && s.UserId == UserId);
        if (set == null) return NotFound();

        // Clean up subscriptions (NoAction FK, must delete manually)
        var subs = await db.SetSubscriptions.Where(s => s.SetId == id).ToListAsync();
        db.SetSubscriptions.RemoveRange(subs);

        db.Sets.Remove(set);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:guid}/words")]
    public async Task<ActionResult<List<WordDto>>> GetWords(Guid id)
    {
        var set = await db.Sets.FirstOrDefaultAsync(s => s.Id == id &&
            (s.UserId == UserId || s.Subscriptions.Any(sub => sub.UserId == UserId)));
        if (set == null) return NotFound();

        var isOwner = set.UserId == UserId;

        var words = await db.SetWords
            .Where(sw => sw.SetId == id)
            .Select(sw => sw.Word)
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
                w.UserProgress.Where(p => p.UserId == UserId).Select(p => p.TimesReviewed).FirstOrDefault(),
                w.UserId == UserId))
            .ToListAsync();

        return Ok(words);
    }

    [HttpPost("{id:guid}/words")]
    public async Task<IActionResult> AddWords(Guid id, AddWordsToSetRequest request)
    {
        var set = await db.Sets.Include(s => s.SetWords)
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == UserId);
        if (set == null) return NotFound();

        var wordIds = new List<Guid>();

        if (request.WordIds?.Count > 0)
        {
            wordIds = request.WordIds;
        }
        else if (request.FromNumber.HasValue && request.ToNumber.HasValue)
        {
            wordIds = await db.Words
                .Where(w => w.UserId == UserId && w.Language == set.Language
                    && w.Number >= request.FromNumber.Value
                    && w.Number <= request.ToNumber.Value)
                .Select(w => w.Id)
                .ToListAsync();
        }

        var existingWordIds = set.SetWords.Select(sw => sw.WordId).ToHashSet();
        foreach (var wordId in wordIds.Where(wid => !existingWordIds.Contains(wid)))
        {
            db.SetWords.Add(new SetWord { SetId = set.Id, WordId = wordId });
        }

        await db.SaveChangesAsync();
        return Ok(new { Added = wordIds.Count(wid => !existingWordIds.Contains(wid)) });
    }

    [HttpDelete("{id:guid}/words")]
    public async Task<IActionResult> RemoveWords(Guid id, [FromBody] List<Guid> wordIds)
    {
        var setWords = await db.SetWords
            .Where(sw => sw.SetId == id && wordIds.Contains(sw.WordId))
            .ToListAsync();

        db.SetWords.RemoveRange(setWords);
        await db.SaveChangesAsync();
        return Ok(new { Removed = setWords.Count });
    }

    // Public sets discovery
    [HttpGet("public")]
    public async Task<ActionResult<List<PublicSetDto>>> GetPublicSets(
        [FromQuery] string? language, [FromQuery] string? search)
    {
        var query = db.Sets.Where(s => s.IsPublic && s.UserId != UserId);

        if (!string.IsNullOrEmpty(language) && Enum.TryParse<Language>(language, true, out var lang))
            query = query.Where(s => s.Language == lang);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(s => s.Name.Contains(search) || (s.Description != null && s.Description.Contains(search)));

        var sets = await query
            .OrderByDescending(s => s.Subscriptions.Count)
            .Take(50)
            .Select(s => new PublicSetDto(
                s.Id,
                s.Name,
                s.Language.ToString(),
                s.Description,
                s.SetWords.Count,
                s.User.DisplayName,
                s.User.ProfilePictureUrl,
                s.Subscriptions.Count,
                s.Subscriptions.Any(sub => sub.UserId == UserId)))
            .ToListAsync();

        return Ok(sets);
    }

    [HttpPost("{id:guid}/subscribe")]
    public async Task<IActionResult> Subscribe(Guid id)
    {
        var set = await db.Sets.FirstOrDefaultAsync(s => s.Id == id && s.IsPublic);
        if (set == null) return NotFound();
        if (set.UserId == UserId) return BadRequest("Je kunt niet abonneren op je eigen set.");

        var exists = await db.SetSubscriptions.AnyAsync(s => s.UserId == UserId && s.SetId == id);
        if (exists) return Ok();

        db.SetSubscriptions.Add(new SetSubscription { UserId = UserId, SetId = id });
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("{id:guid}/subscribe")]
    public async Task<IActionResult> Unsubscribe(Guid id)
    {
        var sub = await db.SetSubscriptions.FirstOrDefaultAsync(s => s.UserId == UserId && s.SetId == id);
        if (sub == null) return NotFound();

        db.SetSubscriptions.Remove(sub);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
