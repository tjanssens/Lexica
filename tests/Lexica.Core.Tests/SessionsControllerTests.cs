using System.Security.Claims;
using Lexica.Api.Controllers;
using Lexica.Core.Entities;
using Lexica.Core.Enums;
using Lexica.Infrastructure.Data;
using Lexica.Shared.DTOs;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Lexica.Core.Tests;

public class SessionsControllerTests
{
    private static AppDbContext NewDb([System.Runtime.CompilerServices.CallerMemberName] string name = "")
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"test-{name}-{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(options);
    }

    private static SessionsController NewController(AppDbContext db, Guid userId)
    {
        var controller = new SessionsController(db);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                [
                    new Claim(ClaimTypes.NameIdentifier, userId.ToString())
                ], "test"))
            }
        };
        return controller;
    }

    private static Word AddWord(AppDbContext db, Guid userId, Set set, int number, string term)
    {
        var word = new Word
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Number = number,
            Language = Language.Latin,
            Term = term,
            Translation = $"vertaling-{term}"
        };
        db.Words.Add(word);
        db.SetWords.Add(new SetWord { SetId = set.Id, WordId = word.Id });
        return word;
    }

    private static void AddReview(AppDbContext db, Guid userId, Guid wordId, ReviewResult result)
    {
        db.ReviewLogs.Add(new ReviewLog
        {
            Id = Guid.NewGuid(),
            WordId = wordId,
            UserId = userId,
            Direction = Direction.TargetToNl,
            Result = result
        });
    }

    private static void AddProgress(AppDbContext db, Guid userId, Guid wordId,
        double easiness, int repetitions, int timesReviewed, DateTime dueDate, DateTime? lastReviewed)
    {
        db.UserWordProgress.Add(new UserWordProgress
        {
            UserId = userId,
            WordId = wordId,
            Easiness = easiness,
            Repetitions = repetitions,
            TimesReviewed = timesReviewed,
            DueDate = dueDate,
            LastReviewed = lastReviewed
        });
    }

    private static List<Guid> ResultIds(ActionResult<List<SessionWordDto>> result)
    {
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var words = Assert.IsType<List<SessionWordDto>>(ok.Value);
        return words.Select(w => w.WordId).ToList();
    }

    [Fact]
    public async Task GetNextSession_OnlyNeverCorrect_SluitOoitJuisteWoordenUit()
    {
        using var db = NewDb();
        var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = "user" };
        var set = new Set { Id = Guid.NewGuid(), UserId = user.Id, Name = "Set", Language = Language.Latin };
        db.Users.Add(user);
        db.Sets.Add(set);

        var newWord = AddWord(db, user.Id, set, 1, "novum");        // nooit gereviewd
        var alwaysWrong = AddWord(db, user.Id, set, 2, "errans");   // alleen fout
        var everCorrect = AddWord(db, user.Id, set, 3, "scitum");   // ooit juist
        AddReview(db, user.Id, alwaysWrong.Id, ReviewResult.Unknown);
        AddReview(db, user.Id, everCorrect.Id, ReviewResult.Known);
        await db.SaveChangesAsync();

        var controller = NewController(db, user.Id);
        var result = await controller.GetNextSession(
            new SessionRequest([set.Id], "TargetToNl", 20, OnlyNeverCorrect: true));

        var ids = ResultIds(result);
        Assert.Contains(newWord.Id, ids);
        Assert.Contains(alwaysWrong.Id, ids);
        Assert.DoesNotContain(everCorrect.Id, ids);
    }

    [Fact]
    public async Task GetNextSession_ZonderFilter_BevatOokOoitJuisteWoorden()
    {
        using var db = NewDb();
        var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = "user" };
        var set = new Set { Id = Guid.NewGuid(), UserId = user.Id, Name = "Set", Language = Language.Latin };
        db.Users.Add(user);
        db.Sets.Add(set);

        var everCorrect = AddWord(db, user.Id, set, 1, "scitum");
        AddReview(db, user.Id, everCorrect.Id, ReviewResult.Known);
        await db.SaveChangesAsync();

        var controller = NewController(db, user.Id);
        var result = await controller.GetNextSession(
            new SessionRequest([set.Id], "TargetToNl", 20, OnlyNeverCorrect: false));

        Assert.Contains(everCorrect.Id, ResultIds(result));
    }

    [Fact]
    public async Task GetNextSession_OnlyNeverCorrect_NegeertJuisteReviewsVanAndereGebruiker()
    {
        using var db = NewDb();
        var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = "user" };
        var other = new ApplicationUser { Id = Guid.NewGuid(), UserName = "other" };
        var set = new Set { Id = Guid.NewGuid(), UserId = user.Id, Name = "Set", Language = Language.Latin };
        db.Users.AddRange(user, other);
        db.Sets.Add(set);

        var word = AddWord(db, user.Id, set, 1, "scitum");
        AddReview(db, other.Id, word.Id, ReviewResult.Known); // andere gebruiker had het juist
        await db.SaveChangesAsync();

        var controller = NewController(db, user.Id);
        var result = await controller.GetNextSession(
            new SessionRequest([set.Id], "TargetToNl", 20, OnlyNeverCorrect: true));

        Assert.Contains(word.Id, ResultIds(result));
    }

    [Fact]
    public async Task GetNextSession_GekendeWoordenMetToekomstigeDueDate_KomenTochTerug()
    {
        // Alle woorden vandaag als 'gekend' beantwoord: DueDate staat op morgen, Repetitions > 0.
        // Een nieuwe sessie later op dezelfde dag mag niet leeg zijn.
        using var db = NewDb();
        var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = "user" };
        var set = new Set { Id = Guid.NewGuid(), UserId = user.Id, Name = "Set", Language = Language.Latin };
        db.Users.Add(user);
        db.Sets.Add(set);

        var tomorrow = DateTime.UtcNow.Date.AddDays(1);
        var now = DateTime.UtcNow;
        var wordIds = new List<Guid>();
        for (var i = 1; i <= 3; i++)
        {
            var w = AddWord(db, user.Id, set, i, $"verbum{i}");
            AddReview(db, user.Id, w.Id, ReviewResult.Known);
            AddProgress(db, user.Id, w.Id, easiness: 2.6, repetitions: 1, timesReviewed: 1, dueDate: tomorrow, lastReviewed: now);
            wordIds.Add(w.Id);
        }
        await db.SaveChangesAsync();

        var controller = NewController(db, user.Id);
        var result = await controller.GetNextSession(new SessionRequest([set.Id], "TargetToNl", 20));

        var ids = ResultIds(result);
        Assert.All(wordIds, id => Assert.Contains(id, ids));
    }

    [Fact]
    public async Task GetNextSession_PrioriteertNieuweWoordenBovenGekende()
    {
        using var db = NewDb();
        var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = "user" };
        var set = new Set { Id = Guid.NewGuid(), UserId = user.Id, Name = "Set", Language = Language.Latin };
        db.Users.Add(user);
        db.Sets.Add(set);

        var nieuw = AddWord(db, user.Id, set, 1, "novum"); // nooit gezien
        var gekend = AddWord(db, user.Id, set, 2, "scitum");
        AddReview(db, user.Id, gekend.Id, ReviewResult.Known);
        AddProgress(db, user.Id, gekend.Id, easiness: 2.5, repetitions: 1, timesReviewed: 1,
            dueDate: DateTime.UtcNow.Date.AddDays(-1), lastReviewed: DateTime.UtcNow.AddDays(-1));
        await db.SaveChangesAsync();

        var controller = NewController(db, user.Id);
        var result = await controller.GetNextSession(new SessionRequest([set.Id], "TargetToNl", 1));

        var ids = ResultIds(result);
        Assert.Contains(nieuw.Id, ids);
        Assert.DoesNotContain(gekend.Id, ids);
    }

    [Fact]
    public async Task GetNextSession_PrioriteertNooitJuisteWoordenBovenGekende()
    {
        using var db = NewDb();
        var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = "user" };
        var set = new Set { Id = Guid.NewGuid(), UserId = user.Id, Name = "Set", Language = Language.Latin };
        db.Users.Add(user);
        db.Sets.Add(set);

        var nooitJuist = AddWord(db, user.Id, set, 1, "errans");
        AddReview(db, user.Id, nooitJuist.Id, ReviewResult.Unknown);
        AddProgress(db, user.Id, nooitJuist.Id, easiness: 2.3, repetitions: 0, timesReviewed: 1,
            dueDate: DateTime.UtcNow.Date.AddDays(1), lastReviewed: DateTime.UtcNow);

        var gekend = AddWord(db, user.Id, set, 2, "scitum");
        AddReview(db, user.Id, gekend.Id, ReviewResult.Known);
        AddProgress(db, user.Id, gekend.Id, easiness: 2.5, repetitions: 1, timesReviewed: 1,
            dueDate: DateTime.UtcNow.Date.AddDays(-1), lastReviewed: DateTime.UtcNow.AddDays(-1));
        await db.SaveChangesAsync();

        var controller = NewController(db, user.Id);
        var result = await controller.GetNextSession(new SessionRequest([set.Id], "TargetToNl", 1));

        var ids = ResultIds(result);
        Assert.Contains(nooitJuist.Id, ids);
        Assert.DoesNotContain(gekend.Id, ids);
    }

    [Fact]
    public async Task GetNextSession_SorteertGekendeWoordenMoeilijksteEerst()
    {
        using var db = NewDb();
        var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = "user" };
        var set = new Set { Id = Guid.NewGuid(), UserId = user.Id, Name = "Set", Language = Language.Latin };
        db.Users.Add(user);
        db.Sets.Add(set);

        var tomorrow = DateTime.UtcNow.Date.AddDays(1);
        var now = DateTime.UtcNow;
        var makkelijk = AddWord(db, user.Id, set, 1, "facile");
        AddReview(db, user.Id, makkelijk.Id, ReviewResult.Known);
        AddProgress(db, user.Id, makkelijk.Id, easiness: 2.8, repetitions: 2, timesReviewed: 2, dueDate: tomorrow, lastReviewed: now);

        var moeilijk = AddWord(db, user.Id, set, 2, "difficile");
        AddReview(db, user.Id, moeilijk.Id, ReviewResult.Known);
        AddProgress(db, user.Id, moeilijk.Id, easiness: 1.4, repetitions: 2, timesReviewed: 2, dueDate: tomorrow, lastReviewed: now);
        await db.SaveChangesAsync();

        var controller = NewController(db, user.Id);
        var result = await controller.GetNextSession(new SessionRequest([set.Id], "TargetToNl", 1));

        var ids = ResultIds(result);
        Assert.Contains(moeilijk.Id, ids);
        Assert.DoesNotContain(makkelijk.Id, ids);
    }

    [Fact]
    public async Task GetNextSession_SorteertGekendeWoordenMetGelijkeMoeilijkheidOudsteEerst()
    {
        using var db = NewDb();
        var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = "user" };
        var set = new Set { Id = Guid.NewGuid(), UserId = user.Id, Name = "Set", Language = Language.Latin };
        db.Users.Add(user);
        db.Sets.Add(set);

        var tomorrow = DateTime.UtcNow.Date.AddDays(1);
        var recent = AddWord(db, user.Id, set, 1, "recens");
        AddReview(db, user.Id, recent.Id, ReviewResult.Known);
        AddProgress(db, user.Id, recent.Id, easiness: 2.0, repetitions: 2, timesReviewed: 2,
            dueDate: tomorrow, lastReviewed: DateTime.UtcNow);

        var oud = AddWord(db, user.Id, set, 2, "vetus");
        AddReview(db, user.Id, oud.Id, ReviewResult.Known);
        AddProgress(db, user.Id, oud.Id, easiness: 2.0, repetitions: 2, timesReviewed: 2,
            dueDate: tomorrow, lastReviewed: DateTime.UtcNow.AddDays(-10));
        await db.SaveChangesAsync();

        var controller = NewController(db, user.Id);
        var result = await controller.GetNextSession(new SessionRequest([set.Id], "TargetToNl", 1));

        var ids = ResultIds(result);
        Assert.Contains(oud.Id, ids);
        Assert.DoesNotContain(recent.Id, ids);
    }
}
