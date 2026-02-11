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
public class WordsController(AppDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<List<WordDto>>> GetAll([FromQuery] string? language)
    {
        var query = db.Words.Where(w => w.UserId == UserId);

        if (!string.IsNullOrEmpty(language) && Enum.TryParse<Language>(language, true, out var lang))
            query = query.Where(w => w.Language == lang);

        var words = await query.OrderBy(w => w.Number)
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

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WordDto>> Get(Guid id)
    {
        var w = await db.Words
            .Where(w => w.Id == id && w.UserId == UserId)
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
            .FirstOrDefaultAsync();
        if (w == null) return NotFound();

        return Ok(w);
    }

    [HttpPost]
    public async Task<ActionResult<WordDto>> Create(CreateWordRequest request)
    {
        if (!Enum.TryParse<Language>(request.Language, true, out var lang))
            return BadRequest("Ongeldige taal. Gebruik 'Latin' of 'Greek'.");

        var exists = await db.Words.AnyAsync(w =>
            w.UserId == UserId && w.Language == lang && w.Number == request.Number);
        if (exists)
            return Conflict($"Woord met nummer {request.Number} bestaat al voor {lang}.");

        var word = new Word
        {
            Id = Guid.NewGuid(),
            UserId = UserId,
            Number = request.Number,
            Language = lang,
            Term = request.Term,
            Translation = request.Translation,
            PartOfSpeech = request.PartOfSpeech
        };

        db.Words.Add(word);

        var progress = new UserWordProgress
        {
            UserId = UserId,
            WordId = word.Id,
            Notes = request.Notes
        };
        db.UserWordProgress.Add(progress);

        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = word.Id }, new WordDto(
            word.Id, word.Number, word.Language.ToString(), word.Term, word.Translation,
            word.PartOfSpeech, progress.Notes, progress.Easiness, progress.Interval,
            progress.Repetitions, progress.DueDate, progress.LastReviewed, progress.TimesReviewed));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WordDto>> Update(Guid id, UpdateWordRequest request)
    {
        var word = await db.Words.FirstOrDefaultAsync(w => w.Id == id && w.UserId == UserId);
        if (word == null) return NotFound();

        if (request.Number.HasValue && request.Number.Value != word.Number)
        {
            var exists = await db.Words.AnyAsync(w =>
                w.UserId == UserId && w.Language == word.Language && w.Number == request.Number.Value && w.Id != id);
            if (exists)
                return Conflict($"Woord met nummer {request.Number.Value} bestaat al.");
            word.Number = request.Number.Value;
        }

        if (request.Term != null) word.Term = request.Term;
        if (request.Translation != null) word.Translation = request.Translation;
        if (request.PartOfSpeech != null) word.PartOfSpeech = request.PartOfSpeech;

        if (request.Notes != null)
        {
            var progress = await db.UserWordProgress
                .FirstOrDefaultAsync(p => p.UserId == UserId && p.WordId == id);
            if (progress == null)
            {
                progress = new UserWordProgress { UserId = UserId, WordId = id };
                db.UserWordProgress.Add(progress);
            }
            progress.Notes = request.Notes;
        }

        await db.SaveChangesAsync();

        var p = await db.UserWordProgress
            .FirstOrDefaultAsync(p => p.UserId == UserId && p.WordId == id);

        return Ok(new WordDto(
            word.Id, word.Number, word.Language.ToString(), word.Term, word.Translation,
            word.PartOfSpeech, p?.Notes, p?.Easiness ?? 2.5, p?.Interval ?? 0,
            p?.Repetitions ?? 0, p?.DueDate ?? DateTime.UtcNow.Date, p?.LastReviewed, p?.TimesReviewed ?? 0));
    }

    [HttpPut("{id:guid}/notes")]
    public async Task<IActionResult> UpdateNotes(Guid id, UpdateNotesRequest request)
    {
        // Allow owner OR subscriber of a set containing this word
        var word = await db.Words.FirstOrDefaultAsync(w => w.Id == id &&
            (w.UserId == UserId || w.SetWords.Any(sw => sw.Set.Subscriptions.Any(sub => sub.UserId == UserId))));
        if (word == null) return NotFound();

        var progress = await db.UserWordProgress
            .FirstOrDefaultAsync(p => p.UserId == UserId && p.WordId == id);
        if (progress == null)
        {
            progress = new UserWordProgress { UserId = UserId, WordId = id };
            db.UserWordProgress.Add(progress);
        }
        progress.Notes = request.Notes;

        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var word = await db.Words.FirstOrDefaultAsync(w => w.Id == id && w.UserId == UserId);
        if (word == null) return NotFound();

        db.Words.Remove(word);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
