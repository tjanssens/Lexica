using ClosedXML.Excel;
using Lexica.Core.Entities;
using Lexica.Core.Enums;
using Lexica.Infrastructure.Data;
using Lexica.Shared.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Lexica.Infrastructure.Services;

public class ExcelImportService(AppDbContext db)
{
    private static readonly Dictionary<string, List<ImportPreviewRow>> _sessions = new();

    public async Task<ImportPreviewResponse> Preview(Stream fileStream, Guid userId)
    {
        var rows = new List<ImportPreviewRow>();
        var existingWords = await db.Words
            .Where(w => w.UserId == userId)
            .Select(w => new { w.Language, w.Number })
            .ToListAsync();
        var existingSet = existingWords.ToHashSet();

        using var workbook = new XLWorkbook(fileStream);
        var worksheet = workbook.Worksheets.First();
        var headerRow = worksheet.Row(1);

        // Map column indices by header name
        var columns = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        for (int col = 1; col <= headerRow.LastCellUsed()?.Address.ColumnNumber; col++)
        {
            var header = headerRow.Cell(col).GetString().Trim().TrimEnd('*');
            if (!string.IsNullOrEmpty(header))
                columns[header] = col;
        }

        for (int row = 2; row <= worksheet.LastRowUsed()?.RowNumber(); row++)
        {
            var errors = new List<string>();
            var wsRow = worksheet.Row(row);

            var numberStr = GetCellValue(wsRow, columns, "number");
            var langStr = GetCellValue(wsRow, columns, "language");
            var term = GetCellValue(wsRow, columns, "term");
            var translation = GetCellValue(wsRow, columns, "translation");
            var partOfSpeech = GetCellValue(wsRow, columns, "part_of_speech");
            var notes = GetCellValue(wsRow, columns, "notes");
            var easinessStr = GetCellValue(wsRow, columns, "easiness");
            var intervalStr = GetCellValue(wsRow, columns, "interval");
            var repsStr = GetCellValue(wsRow, columns, "repetitions");
            var dueDateStr = GetCellValue(wsRow, columns, "due_date");
            var group = GetCellValue(wsRow, columns, "group");

            if (string.IsNullOrEmpty(numberStr) && string.IsNullOrEmpty(term)) continue;

            if (!int.TryParse(numberStr, out var number)) errors.Add("Ongeldig nummer");
            if (string.IsNullOrEmpty(term)) errors.Add("Term is verplicht");
            if (string.IsNullOrEmpty(translation)) errors.Add("Vertaling is verplicht");
            if (!TryParseLanguage(langStr, out var lang)) errors.Add("Ongeldige taal");

            double? easiness = string.IsNullOrEmpty(easinessStr) ? null : double.TryParse(easinessStr, out var ef) ? ef : null;
            int? interval = string.IsNullOrEmpty(intervalStr) ? null : int.TryParse(intervalStr, out var iv) ? iv : null;
            int? reps = string.IsNullOrEmpty(repsStr) ? null : int.TryParse(repsStr, out var rp) ? rp : null;
            DateTime? dueDate = string.IsNullOrEmpty(dueDateStr) ? null : DateTime.TryParse(dueDateStr, out var dd) ? dd : null;

            var isDuplicate = existingSet.Contains(new { Language = lang, Number = number });

            rows.Add(new ImportPreviewRow(
                row, number, langStr ?? "", term ?? "", translation ?? "",
                partOfSpeech, notes, easiness, interval, reps, dueDate,
                group, isDuplicate, errors));
        }

        var sessionId = Guid.NewGuid().ToString();
        _sessions[sessionId] = rows;

        return new ImportPreviewResponse(
            rows,
            rows.Count(r => r.Errors.Count == 0 && !r.IsDuplicate),
            rows.Count(r => r.IsDuplicate),
            rows.Count(r => r.Errors.Count > 0),
            sessionId
        );
    }

    public async Task<ImportResultResponse> Confirm(string sessionId, Guid userId, bool updateDuplicates)
    {
        if (!_sessions.TryGetValue(sessionId, out var rows))
            throw new InvalidOperationException("Import sessie niet gevonden.");

        int imported = 0, updated = 0, skipped = 0, errors = 0;

        foreach (var row in rows)
        {
            if (row.Errors.Count > 0) { errors++; continue; }
            if (!TryParseLanguage(row.Language, out var lang)) { errors++; continue; }

            var existing = await db.Words.FirstOrDefaultAsync(w =>
                w.UserId == userId && w.Language == lang && w.Number == row.Number);

            if (existing != null)
            {
                if (updateDuplicates)
                {
                    existing.Term = row.Term;
                    existing.Translation = row.Translation;
                    existing.PartOfSpeech = row.PartOfSpeech;

                    var progress = await db.UserWordProgress
                        .FirstOrDefaultAsync(p => p.UserId == userId && p.WordId == existing.Id);
                    if (progress == null)
                    {
                        progress = new UserWordProgress { UserId = userId, WordId = existing.Id };
                        db.UserWordProgress.Add(progress);
                    }
                    progress.Notes = row.Notes;
                    if (row.Easiness.HasValue) progress.Easiness = row.Easiness.Value;
                    if (row.Interval.HasValue) progress.Interval = row.Interval.Value;
                    if (row.Repetitions.HasValue) progress.Repetitions = row.Repetitions.Value;
                    if (row.DueDate.HasValue) progress.DueDate = row.DueDate.Value;
                    updated++;
                }
                else
                {
                    skipped++;
                }
                continue;
            }

            var word = new Word
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Number = row.Number,
                Language = lang,
                Term = row.Term,
                Translation = row.Translation,
                PartOfSpeech = row.PartOfSpeech
            };
            db.Words.Add(word);

            var wordProgress = new UserWordProgress
            {
                UserId = userId,
                WordId = word.Id,
                Notes = row.Notes,
                Easiness = row.Easiness ?? 2.5,
                Interval = row.Interval ?? 0,
                Repetitions = row.Repetitions ?? 0,
                DueDate = row.DueDate ?? DateTime.UtcNow.Date
            };
            db.UserWordProgress.Add(wordProgress);

            // Handle group assignment
            if (!string.IsNullOrEmpty(row.Group))
            {
                var group = await db.Groups.FirstOrDefaultAsync(g =>
                    g.UserId == userId && g.Name == row.Group && g.Language == lang);
                if (group == null)
                {
                    group = new Group
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        Name = row.Group,
                        Language = lang
                    };
                    db.Groups.Add(group);
                }
                db.GroupWords.Add(new GroupWord { GroupId = group.Id, WordId = word.Id });
            }

            imported++;
        }

        await db.SaveChangesAsync();
        _sessions.Remove(sessionId);

        return new ImportResultResponse(imported, updated, skipped, errors);
    }

    private static readonly Dictionary<string, Language> LanguageAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["el"] = Language.Greek,
        ["greek"] = Language.Greek,
        ["grieks"] = Language.Greek,
        ["la"] = Language.Latin,
        ["latin"] = Language.Latin,
        ["latijn"] = Language.Latin,
    };

    private static bool TryParseLanguage(string? value, out Language lang)
    {
        lang = default;
        if (string.IsNullOrEmpty(value)) return false;
        if (LanguageAliases.TryGetValue(value, out lang)) return true;
        return Enum.TryParse(value, true, out lang);
    }

    private static string? GetCellValue(IXLRow row, Dictionary<string, int> columns, string columnName)
    {
        if (!columns.TryGetValue(columnName, out var col)) return null;
        var value = row.Cell(col).GetString().Trim();
        return string.IsNullOrEmpty(value) ? null : value;
    }
}
