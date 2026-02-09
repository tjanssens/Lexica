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
                w.PartOfSpeech, w.Notes, w.Easiness, w.Interval, w.Repetitions,
                w.DueDate, w.LastReviewed, w.TimesReviewed))
            .ToListAsync();

        return Ok(words);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WordDto>> Get(Guid id)
    {
        var w = await db.Words.FirstOrDefaultAsync(w => w.Id == id && w.UserId == UserId);
        if (w == null) return NotFound();

        return Ok(new WordDto(
            w.Id, w.Number, w.Language.ToString(), w.Term, w.Translation,
            w.PartOfSpeech, w.Notes, w.Easiness, w.Interval, w.Repetitions,
            w.DueDate, w.LastReviewed, w.TimesReviewed));
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
            PartOfSpeech = request.PartOfSpeech,
            Notes = request.Notes
        };

        db.Words.Add(word);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = word.Id }, new WordDto(
            word.Id, word.Number, word.Language.ToString(), word.Term, word.Translation,
            word.PartOfSpeech, word.Notes, word.Easiness, word.Interval, word.Repetitions,
            word.DueDate, word.LastReviewed, word.TimesReviewed));
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
        if (request.Notes != null) word.Notes = request.Notes;

        await db.SaveChangesAsync();

        return Ok(new WordDto(
            word.Id, word.Number, word.Language.ToString(), word.Term, word.Translation,
            word.PartOfSpeech, word.Notes, word.Easiness, word.Interval, word.Repetitions,
            word.DueDate, word.LastReviewed, word.TimesReviewed));
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
