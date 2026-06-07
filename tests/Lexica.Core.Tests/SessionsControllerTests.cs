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
}
