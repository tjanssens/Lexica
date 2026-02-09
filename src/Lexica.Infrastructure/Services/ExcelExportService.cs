using ClosedXML.Excel;
using Lexica.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Lexica.Infrastructure.Services;

public class ExcelExportService(AppDbContext db)
{
    private static readonly string[] Headers =
    [
        "number*", "language*", "term*", "translation*",
        "part_of_speech", "notes", "easiness", "interval",
        "repetitions", "due_date", "group"
    ];

    public byte[] GenerateTemplate()
    {
        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Words");
        WriteHeaders(worksheet);
        return ToBytes(workbook);
    }

    public async Task<byte[]> ExportWords(Guid userId)
    {
        var words = await db.Words
            .Where(w => w.UserId == userId)
            .Include(w => w.GroupWords)
                .ThenInclude(gw => gw.Group)
            .OrderBy(w => w.Language)
            .ThenBy(w => w.Number)
            .ToListAsync();

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Words");
        WriteHeaders(worksheet);

        for (int i = 0; i < words.Count; i++)
        {
            var w = words[i];
            var row = i + 2;
            worksheet.Cell(row, 1).Value = w.Number;
            worksheet.Cell(row, 2).Value = w.Language.ToString();
            worksheet.Cell(row, 3).Value = w.Term;
            worksheet.Cell(row, 4).Value = w.Translation;
            worksheet.Cell(row, 5).Value = w.PartOfSpeech ?? "";
            worksheet.Cell(row, 6).Value = w.Notes ?? "";
            worksheet.Cell(row, 7).Value = w.Easiness;
            worksheet.Cell(row, 8).Value = w.Interval;
            worksheet.Cell(row, 9).Value = w.Repetitions;
            worksheet.Cell(row, 10).Value = w.DueDate.ToString("yyyy-MM-dd");
            worksheet.Cell(row, 11).Value = w.GroupWords.FirstOrDefault()?.Group?.Name ?? "";
        }

        worksheet.Columns().AdjustToContents();
        return ToBytes(workbook);
    }

    private static void WriteHeaders(IXLWorksheet worksheet)
    {
        for (int i = 0; i < Headers.Length; i++)
        {
            var cell = worksheet.Cell(1, i + 1);
            cell.Value = Headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#0f3460");
            cell.Style.Font.FontColor = XLColor.White;
        }

        worksheet.Columns().AdjustToContents();
    }

    private static byte[] ToBytes(XLWorkbook workbook)
    {
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }
}
