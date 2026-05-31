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

        // Bestaande woorden bepalen de identiteit (genormaliseerde term + taal) en
        // het startpunt voor de hernummering (hoogste nummer per taal).
        var existingWords = await db.Words
            .Where(w => w.UserId == userId)
            .Select(w => new { w.Language, w.Number, w.Term })
            .ToListAsync();

        var existingTerms = new HashSet<(Language, string)>();
        var nextNumber = new Dictionary<Language, int>();
        foreach (var w in existingWords)
        {
            existingTerms.Add((w.Language, NormalizeTerm(w.Term)));
            nextNumber[w.Language] = Math.Max(nextNumber.GetValueOrDefault(w.Language), w.Number);
        }

        // Termen die binnen dít bestand al een nummer toegewezen kregen (in-bestand-dubbels).
        var seenInFile = new HashSet<(Language, string)>();

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

            // Lege rij overslaan. Het nummer is niet langer leidend — de term is de identiteit.
            if (string.IsNullOrEmpty(term) && string.IsNullOrEmpty(translation)) continue;

            // Nummer uit Excel is enkel informatief; het wordt bij import opnieuw toegekend.
            int? originalNumber = int.TryParse(numberStr, out var parsedNumber) ? parsedNumber : null;

            if (string.IsNullOrEmpty(term)) errors.Add("Term is verplicht");
            if (string.IsNullOrEmpty(translation)) errors.Add("Vertaling is verplicht");
            if (!TryParseLanguage(langStr, out var lang)) errors.Add("Ongeldige taal");

            double? easiness = string.IsNullOrEmpty(easinessStr) ? null : double.TryParse(easinessStr, out var ef) ? ef : null;
            int? interval = string.IsNullOrEmpty(intervalStr) ? null : int.TryParse(intervalStr, out var iv) ? iv : null;
            int? reps = string.IsNullOrEmpty(repsStr) ? null : int.TryParse(repsStr, out var rp) ? rp : null;
            DateTime? dueDate = string.IsNullOrEmpty(dueDateStr) ? null : DateTime.TryParse(dueDateStr, out var dd) ? dd : null;

            var isDuplicate = false;
            var assignedNumber = originalNumber ?? 0;
            var numberChanged = false;

            if (errors.Count == 0)
            {
                var key = (lang, NormalizeTerm(term!));
                if (existingTerms.Contains(key) || seenInFile.Contains(key))
                {
                    isDuplicate = true;
                }
                else
                {
                    seenInFile.Add(key);
                    assignedNumber = NextNumber(nextNumber, lang);
                    numberChanged = originalNumber != assignedNumber;
                }
            }

            rows.Add(new ImportPreviewRow(
                row, originalNumber, assignedNumber, langStr ?? "", term ?? "", translation ?? "",
                partOfSpeech, notes, easiness, interval, reps, dueDate,
                group, isDuplicate, numberChanged, errors));
        }

        var sessionId = Guid.NewGuid().ToString();
        _sessions[sessionId] = rows;

        return new ImportPreviewResponse(
            rows,
            rows.Count(r => r.Errors.Count == 0 && !r.IsDuplicate),
            rows.Count(r => r.IsDuplicate),
            rows.Count(r => r.Errors.Count > 0),
            rows.Count(r => r.NumberChanged),
            sessionId
        );
    }

    public async Task<ImportResultResponse> Confirm(string sessionId, Guid userId, bool updateDuplicates)
    {
        if (!_sessions.TryGetValue(sessionId, out var rows))
            throw new InvalidOperationException("Import sessie niet gevonden.");

        int imported = 0, updated = 0, skipped = 0, errors = 0;

        // Match op (taal, genormaliseerde term) tegen de actuele DB en hernummer per taal.
        // We herberekenen hier i.p.v. het preview-nummer te hergebruiken, zodat de toegekende
        // nummers niet botsen met de unieke index (UserId, Language, Number) als de DB intussen wijzigde.
        var existing = await db.Words.Where(w => w.UserId == userId).ToListAsync();
        var byTerm = new Dictionary<(Language, string), Word>();
        var nextNumber = new Dictionary<Language, int>();
        foreach (var w in existing)
        {
            byTerm[(w.Language, NormalizeTerm(w.Term))] = w;
            nextNumber[w.Language] = Math.Max(nextNumber.GetValueOrDefault(w.Language), w.Number);
        }

        foreach (var row in rows)
        {
            if (row.Errors.Count > 0) { errors++; continue; }
            if (!TryParseLanguage(row.Language, out var lang)) { errors++; continue; }

            var key = (lang, NormalizeTerm(row.Term));

            // Bestaand woord (in DB of eerder in deze import aangemaakt) met dezelfde term+taal.
            if (byTerm.TryGetValue(key, out var existingWord))
            {
                if (updateDuplicates)
                {
                    existingWord.Term = row.Term;
                    existingWord.Translation = row.Translation;
                    existingWord.PartOfSpeech = row.PartOfSpeech;

                    var progress = await db.UserWordProgress
                        .FirstOrDefaultAsync(p => p.UserId == userId && p.WordId == existingWord.Id);
                    if (progress == null)
                    {
                        progress = new UserWordProgress { UserId = userId, WordId = existingWord.Id };
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
                Number = NextNumber(nextNumber, lang),
                Language = lang,
                Term = row.Term,
                Translation = row.Translation,
                PartOfSpeech = row.PartOfSpeech
            };
            db.Words.Add(word);
            byTerm[key] = word;

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

    // Identiteit van een woord binnen een taal: hoofdletter- en spatie-ongevoelig, accenten blijven onderscheidend.
    private static string NormalizeTerm(string term) => term.Trim().ToLowerInvariant();

    // Volgende vrije nummer voor een taal (hoogste tot nu toe + 1) en werkt de teller bij.
    private static int NextNumber(Dictionary<Language, int> counters, Language language)
    {
        var next = counters.GetValueOrDefault(language) + 1;
        counters[language] = next;
        return next;
    }

    private static readonly Dictionary<string, Language> LanguageAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["el"] = Language.Greek,
        ["greek"] = Language.Greek,
        ["grieks"] = Language.Greek,
        ["la"] = Language.Latin,
        ["latin"] = Language.Latin,
        ["latijn"] = Language.Latin,
        ["en"] = Language.English,
        ["english"] = Language.English,
        ["engels"] = Language.English,
        ["fr"] = Language.French,
        ["french"] = Language.French,
        ["frans"] = Language.French,
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
