using ClosedXML.Excel;
using Lexica.Core.Entities;
using Lexica.Core.Enums;
using Lexica.Infrastructure.Data;
using Lexica.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Xunit;

namespace Lexica.Core.Tests;

public class ExcelImportServiceTests
{
    private static AppDbContext NewDb([System.Runtime.CompilerServices.CallerMemberName] string name = "")
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"test-{name}-{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(options);
    }

    private static ExcelImportService NewService(AppDbContext db) =>
        new(db, new MemoryCache(new MemoryCacheOptions()));

    // Bouwt een in-memory Excel-stream met vaste koppen en de meegegeven rijen (number, language, term, translation).
    private static Stream BuildExcel(params (string? number, string language, string term, string translation)[] rows)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Woorden");
        ws.Cell(1, 1).Value = "number";
        ws.Cell(1, 2).Value = "language";
        ws.Cell(1, 3).Value = "term";
        ws.Cell(1, 4).Value = "translation";

        for (int i = 0; i < rows.Length; i++)
        {
            var r = i + 2;
            ws.Cell(r, 1).Value = rows[i].number ?? "";
            ws.Cell(r, 2).Value = rows[i].language;
            ws.Cell(r, 3).Value = rows[i].term;
            ws.Cell(r, 4).Value = rows[i].translation;
        }

        var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;
        return stream;
    }

    private static async Task<ApplicationUser> SeedUserAsync(AppDbContext db, params (int number, Language lang, string term)[] words)
    {
        var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = "user", DisplayName = "User" };
        db.Users.Add(user);
        foreach (var (number, lang, term) in words)
            db.Words.Add(new Word { Id = Guid.NewGuid(), UserId = user.Id, Number = number, Language = lang, Term = term, Translation = "x" });
        await db.SaveChangesAsync();
        return user;
    }

    [Fact]
    public async Task Preview_NieuweWoorden_WordenHernummerdVanafEerstvolgendeNummer()
    {
        using var db = NewDb();
        // Bestaand: Frans 1..3. Volgende vrije nummer = 4.
        var user = await SeedUserAsync(db,
            (1, Language.French, "un cinéma"),
            (2, Language.French, "un hôpital"),
            (3, Language.French, "un restaurant"));
        var service = NewService(db);

        // Import begint (zoals in het probleem) ook bij nummer 1, maar met andere termen.
        using var excel = BuildExcel(
            ("1", "Frans", "avoir", "hebben"),
            ("2", "Frans", "être", "zijn"));

        var result = await service.Preview(excel, user.Id);

        Assert.Equal(2, result.ValidCount);
        Assert.Equal(0, result.DuplicateCount);
        Assert.Equal(2, result.RenumberedCount);

        Assert.Equal(4, result.Rows[0].Number);
        Assert.Equal(1, result.Rows[0].OriginalNumber);
        Assert.True(result.Rows[0].NumberChanged);

        Assert.Equal(5, result.Rows[1].Number);
        Assert.Equal(2, result.Rows[1].OriginalNumber);
    }

    [Fact]
    public async Task Preview_TermDieAlBestaat_WordtAlsDuplicaatGemarkeerd()
    {
        using var db = NewDb();
        var user = await SeedUserAsync(db, (20, Language.French, "savoir"));
        var service = NewService(db);

        using var excel = BuildExcel(
            ("125", "Frans", "savoir", "weten, kennen, kunnen"),
            ("126", "Frans", "connaître", "kennen"));

        var result = await service.Preview(excel, user.Id);

        Assert.True(result.Rows[0].IsDuplicate);   // savoir bestaat al
        Assert.False(result.Rows[1].IsDuplicate);  // connaître is nieuw
        Assert.Equal(1, result.DuplicateCount);
        Assert.Equal(21, result.Rows[1].Number);   // hernummerd naar max(20)+1
    }

    [Fact]
    public async Task Preview_TermMatchIsHoofdletterEnSpatieOngevoelig()
    {
        using var db = NewDb();
        var user = await SeedUserAsync(db, (1, Language.French, "avoir"));
        var service = NewService(db);

        using var excel = BuildExcel(("9", "Frans", "  AVOIR ", "hebben"));

        var result = await service.Preview(excel, user.Id);

        Assert.True(result.Rows[0].IsDuplicate);
    }

    [Fact]
    public async Task Preview_AccentenZijnOnderscheidend()
    {
        using var db = NewDb();
        var user = await SeedUserAsync(db, (1, Language.French, "côté"));
        var service = NewService(db);

        using var excel = BuildExcel(("9", "Frans", "cote", "notering"));

        var result = await service.Preview(excel, user.Id);

        Assert.False(result.Rows[0].IsDuplicate); // "cote" != "côté"
    }

    [Fact]
    public async Task Preview_DubbeleTermInBestand_TweedeIsDuplicaat()
    {
        using var db = NewDb();
        var user = await SeedUserAsync(db); // geen bestaande woorden
        var service = NewService(db);

        using var excel = BuildExcel(
            ("1", "Frans", "avoir", "hebben"),
            ("2", "Frans", "avoir", "hebben (nogmaals)"));

        var result = await service.Preview(excel, user.Id);

        Assert.False(result.Rows[0].IsDuplicate);
        Assert.True(result.Rows[1].IsDuplicate);
        Assert.Equal(1, result.Rows[0].Number); // eerste taal-woord krijgt nummer 1
    }

    [Fact]
    public async Task Preview_NummeringIsPerTaalGescheiden()
    {
        using var db = NewDb();
        var user = await SeedUserAsync(db,
            (5, Language.French, "bonjour"),
            (10, Language.English, "hello"));
        var service = NewService(db);

        using var excel = BuildExcel(
            ("1", "Frans", "merci", "dank je"),
            ("1", "Engels", "thanks", "dank je"));

        var result = await service.Preview(excel, user.Id);

        Assert.Equal(6, result.Rows[0].Number);  // Frans: max(5)+1
        Assert.Equal(11, result.Rows[1].Number); // Engels: max(10)+1
    }

    [Fact]
    public async Task Confirm_MaaktNieuweWoordenMetHernummerdeNummers()
    {
        using var db = NewDb();
        var user = await SeedUserAsync(db, (3, Language.French, "un restaurant"));
        var service = NewService(db);

        using var excel = BuildExcel(
            ("1", "Frans", "avoir", "hebben"),
            ("2", "Frans", "être", "zijn"));

        var preview = await service.Preview(excel, user.Id);
        var result = await service.Confirm(preview.SessionId, user.Id, updateDuplicates: false);

        Assert.Equal(2, result.Imported);
        Assert.Equal(0, result.Updated);

        var frans = await db.Words.Where(w => w.UserId == user.Id && w.Language == Language.French)
            .OrderBy(w => w.Number).ToListAsync();
        Assert.Equal(new[] { 3, 4, 5 }, frans.Select(w => w.Number).ToArray());
        Assert.Contains(frans, w => w.Term == "avoir" && w.Number == 4);
        Assert.Contains(frans, w => w.Term == "être" && w.Number == 5);
    }

    [Fact]
    public async Task Confirm_DuplicaatTermWordtBijgewerktWanneerGevraagd()
    {
        using var db = NewDb();
        var user = await SeedUserAsync(db, (1, Language.French, "savoir"));
        var service = NewService(db);

        using var excel = BuildExcel(("99", "Frans", "savoir", "weten, kennen, kunnen"));

        var preview = await service.Preview(excel, user.Id);
        var result = await service.Confirm(preview.SessionId, user.Id, updateDuplicates: true);

        Assert.Equal(0, result.Imported);
        Assert.Equal(1, result.Updated);

        var word = await db.Words.SingleAsync(w => w.UserId == user.Id && w.Term == "savoir");
        Assert.Equal(1, word.Number); // behoudt bestaand nummer
        Assert.Equal("weten, kennen, kunnen", word.Translation);
    }

    [Fact]
    public async Task Confirm_DuplicaatTermWordtOvergeslagenWanneerNietGevraagd()
    {
        using var db = NewDb();
        var user = await SeedUserAsync(db, (1, Language.French, "savoir"));
        var service = NewService(db);

        using var excel = BuildExcel(("99", "Frans", "savoir", "andere vertaling"));

        var preview = await service.Preview(excel, user.Id);
        var result = await service.Confirm(preview.SessionId, user.Id, updateDuplicates: false);

        Assert.Equal(0, result.Imported);
        Assert.Equal(1, result.Skipped);

        var word = await db.Words.SingleAsync(w => w.UserId == user.Id && w.Term == "savoir");
        Assert.Equal("x", word.Translation); // ongewijzigd
    }
}
