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

public class GroupsControllerSecurityTests
{
    private static AppDbContext NewDb([System.Runtime.CompilerServices.CallerMemberName] string name = "")
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"test-{name}-{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(options);
    }

    private static GroupsController NewController(AppDbContext db, Guid userId)
    {
        var controller = new GroupsController(db);
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

    [Fact]
    public async Task RemoveWords_WeigertNietEigenaarEnLaatGroepOngewijzigd()
    {
        using var db = NewDb();
        var owner = new ApplicationUser { Id = Guid.NewGuid(), UserName = "owner" };
        var attacker = new ApplicationUser { Id = Guid.NewGuid(), UserName = "attacker" };
        var word = new Word
        {
            Id = Guid.NewGuid(),
            UserId = owner.Id,
            Number = 1,
            Language = Language.Latin,
            Term = "amare",
            Translation = "houden van"
        };
        var group = new Group { Id = Guid.NewGuid(), UserId = owner.Id, Name = "Private", Language = Language.Latin };

        db.Users.AddRange(owner, attacker);
        db.Words.Add(word);
        db.Groups.Add(group);
        db.GroupWords.Add(new GroupWord { GroupId = group.Id, WordId = word.Id });
        await db.SaveChangesAsync();

        var controller = NewController(db, attacker.Id);

        var result = await controller.RemoveWords(group.Id, [word.Id]);

        Assert.IsType<NotFoundResult>(result);
        Assert.True(await db.GroupWords.AnyAsync(gw => gw.GroupId == group.Id && gw.WordId == word.Id));
    }

    [Fact]
    public async Task AddWords_NegeertWoordVanAndereGebruiker()
    {
        using var db = NewDb();
        var owner = new ApplicationUser { Id = Guid.NewGuid(), UserName = "owner" };
        var other = new ApplicationUser { Id = Guid.NewGuid(), UserName = "other" };
        var group = new Group { Id = Guid.NewGuid(), UserId = owner.Id, Name = "Mine", Language = Language.Latin };
        var otherWord = new Word
        {
            Id = Guid.NewGuid(),
            UserId = other.Id,
            Number = 1,
            Language = Language.Latin,
            Term = "alienum",
            Translation = "van iemand anders"
        };

        db.Users.AddRange(owner, other);
        db.Groups.Add(group);
        db.Words.Add(otherWord);
        await db.SaveChangesAsync();

        var controller = NewController(db, owner.Id);

        await controller.AddWords(group.Id, new AddWordsToGroupRequest([otherWord.Id], null, null));

        Assert.False(await db.GroupWords.AnyAsync(gw => gw.GroupId == group.Id && gw.WordId == otherWord.Id));
    }

    [Fact]
    public async Task AddWords_VoegtEigenWoordToe()
    {
        using var db = NewDb();
        var owner = new ApplicationUser { Id = Guid.NewGuid(), UserName = "owner" };
        var group = new Group { Id = Guid.NewGuid(), UserId = owner.Id, Name = "Mine", Language = Language.Latin };
        var word = new Word
        {
            Id = Guid.NewGuid(),
            UserId = owner.Id,
            Number = 1,
            Language = Language.Latin,
            Term = "meum",
            Translation = "van mij"
        };

        db.Users.Add(owner);
        db.Groups.Add(group);
        db.Words.Add(word);
        await db.SaveChangesAsync();

        var controller = NewController(db, owner.Id);

        await controller.AddWords(group.Id, new AddWordsToGroupRequest([word.Id], null, null));

        Assert.True(await db.GroupWords.AnyAsync(gw => gw.GroupId == group.Id && gw.WordId == word.Id));
    }
}
