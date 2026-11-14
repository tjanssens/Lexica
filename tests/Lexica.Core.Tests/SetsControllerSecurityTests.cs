using System.Security.Claims;
using Lexica.Api.Controllers;
using Lexica.Core.Entities;
using Lexica.Core.Enums;
using Lexica.Infrastructure.Data;
using Lexica.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Lexica.Core.Tests;

public class SetsControllerSecurityTests
{
    private static AppDbContext NewDb([System.Runtime.CompilerServices.CallerMemberName] string name = "")
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"test-{name}-{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(options);
    }

    private static SetsController NewController(AppDbContext db, Guid userId)
    {
        var controller = new SetsController(db, new SetForkService(db),
            new ExcelImportService(db, new Microsoft.Extensions.Caching.Memory.MemoryCache(new Microsoft.Extensions.Caching.Memory.MemoryCacheOptions())));
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
    public async Task RemoveWords_WeigertNietEigenaarEnLaatSetOngewijzigd()
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
        var set = new Set
        {
            Id = Guid.NewGuid(),
            UserId = owner.Id,
            Name = "Public",
            Language = Language.Latin,
            IsPublic = true
        };

        db.Users.AddRange(owner, attacker);
        db.Words.Add(word);
        db.Sets.Add(set);
        db.SetWords.Add(new SetWord { SetId = set.Id, WordId = word.Id });
        await db.SaveChangesAsync();

        var controller = NewController(db, attacker.Id);

        var result = await controller.RemoveWords(set.Id, [word.Id]);

        Assert.IsType<NotFoundResult>(result);
        Assert.True(await db.SetWords.AnyAsync(sw => sw.SetId == set.Id && sw.WordId == word.Id));
    }

    [Fact]
    public async Task AddWords_NegeertWoordVanAndereGebruiker()
    {
        using var db = NewDb();
        var owner = new ApplicationUser { Id = Guid.NewGuid(), UserName = "owner" };
        var other = new ApplicationUser { Id = Guid.NewGuid(), UserName = "other" };
        var set = new Set { Id = Guid.NewGuid(), UserId = owner.Id, Name = "Mine", Language = Language.Latin };
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
        db.Sets.Add(set);
        db.Words.Add(otherWord);
        await db.SaveChangesAsync();

        var controller = NewController(db, owner.Id);

        await controller.AddWords(set.Id, new([otherWord.Id], null, null));

        Assert.False(await db.SetWords.AnyAsync(sw => sw.SetId == set.Id && sw.WordId == otherWord.Id));
    }

    [Fact]
    public async Task AddWords_VoegtEigenWoordToe()
    {
        using var db = NewDb();
        var owner = new ApplicationUser { Id = Guid.NewGuid(), UserName = "owner" };
        var set = new Set { Id = Guid.NewGuid(), UserId = owner.Id, Name = "Mine", Language = Language.Latin };
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
        db.Sets.Add(set);
        db.Words.Add(word);
        await db.SaveChangesAsync();

        var controller = NewController(db, owner.Id);

        await controller.AddWords(set.Id, new([word.Id], null, null));

        Assert.True(await db.SetWords.AnyAsync(sw => sw.SetId == set.Id && sw.WordId == word.Id));
    }

    private static PhotoWordExtractionService PhotoService(string? apiKey) => new(
        Microsoft.Extensions.Options.Options.Create(new AnthropicOptions { ApiKey = apiKey }),
        Microsoft.Extensions.Logging.Abstractions.NullLogger<PhotoWordExtractionService>.Instance);

    private static IFormFile Photo(string contentType, int size = 10)
    {
        var stream = new MemoryStream(new byte[size]);
        return new FormFile(stream, 0, size, "file", "foto.jpg") { Headers = new HeaderDictionary(), ContentType = contentType };
    }

    [Fact]
    public async Task ImportPhoto_WeigertSetVanAndereGebruiker()
    {
        using var db = NewDb();
        var owner = new ApplicationUser { Id = Guid.NewGuid(), UserName = "owner" };
        var set = new Set { Id = Guid.NewGuid(), UserId = owner.Id, Name = "S", Language = Language.Latin, IsPublic = true };
        db.Users.Add(owner);
        db.Sets.Add(set);
        await db.SaveChangesAsync();

        var controller = NewController(db, Guid.NewGuid());
        var result = await controller.ImportPhoto(set.Id, Photo("image/jpeg"), PhotoService("key"),
            new Microsoft.Extensions.Caching.Memory.MemoryCache(new Microsoft.Extensions.Caching.Memory.MemoryCacheOptions()), default);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task ImportPhoto_ZonderApiSleutelGeeft503EnGeenFotoVerwerking()
    {
        using var db = NewDb();
        var owner = new ApplicationUser { Id = Guid.NewGuid(), UserName = "owner" };
        var set = new Set { Id = Guid.NewGuid(), UserId = owner.Id, Name = "S", Language = Language.Latin };
        db.Users.Add(owner);
        db.Sets.Add(set);
        await db.SaveChangesAsync();

        var controller = NewController(db, owner.Id);
        var result = await controller.ImportPhoto(set.Id, Photo("image/jpeg"), PhotoService(null),
            new Microsoft.Extensions.Caching.Memory.MemoryCache(new Microsoft.Extensions.Caching.Memory.MemoryCacheOptions()), default);

        var status = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, status.StatusCode);
    }

    [Fact]
    public async Task ImportPhoto_WeigertGeenAfbeelding()
    {
        using var db = NewDb();
        var owner = new ApplicationUser { Id = Guid.NewGuid(), UserName = "owner" };
        var set = new Set { Id = Guid.NewGuid(), UserId = owner.Id, Name = "S", Language = Language.Latin };
        db.Users.Add(owner);
        db.Sets.Add(set);
        await db.SaveChangesAsync();

        var controller = NewController(db, owner.Id);
        var result = await controller.ImportPhoto(set.Id, Photo("application/pdf"), PhotoService("key"),
            new Microsoft.Extensions.Caching.Memory.MemoryCache(new Microsoft.Extensions.Caching.Memory.MemoryCacheOptions()), default);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
