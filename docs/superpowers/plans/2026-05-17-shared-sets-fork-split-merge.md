# Gedeelde sets — eigen kopie, splitsen, samenvoegen, mixen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Geabonneerde gebruikers kunnen een gedeelde set met één klik forken tot een eigen, onafhankelijke kopie (incl. SM-2 progress), en op eigen sets de operaties splitsen / samenvoegen / woorden verplaatsen uitvoeren.

**Architecture:** Nieuwe `SetForkService` in `Lexica.Core/Services/` bevat alle business-logica (copy/split/merge/move). Bestaande `SetsController` blijft thin en delegeert. Eén EF Core migratie voegt twee herkomst-kolommen toe aan `Word`. Tests draaien tegen EF Core InMemory in een nieuw `Lexica.Core.Tests` project. Frontend krijgt nieuwe UI in `set-detail` en `set-list` componenten plus methodes in `ApiService`.

**Tech Stack:** .NET 9 / EF Core 9 / Npgsql / xUnit / EF Core InMemory provider / Angular 17 standalone components.

**Spec:** `docs/superpowers/specs/2026-05-17-shared-sets-fork-split-merge-design.md`

---

## File Structure

**Backend — wijzigen / aanmaken:**
- Modify: `src/Lexica.Core/Entities/Word.cs` — twee nullable kolommen toevoegen
- Create: `src/Lexica.Infrastructure/Migrations/<timestamp>_AddWordOriginAttribution.cs` — auto-generated
- Create: `src/Lexica.Core/Services/SetForkService.cs` — alle copy/split/merge/move logica
- Modify: `src/Lexica.Shared/DTOs/SetDtos.cs` — 3 nieuwe request-records
- Modify: `src/Lexica.Shared/DTOs/WordDtos.cs` — `WordDto` krijgt `OriginalAuthorDisplayName`
- Modify: `src/Lexica.Api/Controllers/SetsController.cs` — 4 nieuwe endpoints, projectie van nieuw veld in `GetWords`
- Modify: `src/Lexica.Api/Program.cs` — DI-registratie

**Tests — aanmaken:**
- Create: `tests/Lexica.Core.Tests/Lexica.Core.Tests.csproj`
- Create: `tests/Lexica.Core.Tests/SetForkServiceTests.cs`
- Modify: `Lexica.sln` — testproject toevoegen

**Frontend — wijzigen:**
- Modify: `src/lexica-frontend/src/app/core/services/api.service.ts` — 4 nieuwe methodes + DTO-interfaces + `OriginalAuthorDisplayName` op `WordDto`
- Modify: `src/lexica-frontend/src/app/features/sets/set-detail.component.ts` — "Maak eigen kopie"-knop in owner-banner, multi-select op woordenlijst, herkomst-tooltip
- Modify: `src/lexica-frontend/src/app/features/sets/set-list.component.ts` — visueel onderscheid eigen/geabonneerd, multi-select sets, "Voeg samen"-actie

---

## Task 1: Voeg herkomst-kolommen toe aan Word + migratie

**Files:**
- Modify: `src/Lexica.Core/Entities/Word.cs`
- Create: `src/Lexica.Infrastructure/Migrations/<timestamp>_AddWordOriginAttribution.cs` (auto-generated)

- [ ] **Step 1: Voeg twee kolommen toe aan Word**

Wijzig `src/Lexica.Core/Entities/Word.cs` — voeg deze twee properties toe direct na `PartOfSpeech`:

```csharp
public string? PartOfSpeech { get; set; }
public Guid? SourceWordId { get; set; }
public string? OriginalAuthorDisplayName { get; set; }
public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
```

Geen FK-configuratie nodig in `AppDbContext`: `SourceWordId` is een losse nullable Guid (geen navigation property, geen cascade).

- [ ] **Step 2: Genereer migratie**

Run:
```
dotnet ef migrations add AddWordOriginAttribution --project src/Lexica.Infrastructure --startup-project src/Lexica.Api
```
Expected: nieuw bestand verschijnt onder `src/Lexica.Infrastructure/Migrations/`. Open het en verifieer dat het twee `AddColumn`-statements bevat voor `SourceWordId` (uuid, nullable) en `OriginalAuthorDisplayName` (text, nullable) op de `Words`-tabel, en dat de `Down`-methode beide weer dropt.

- [ ] **Step 3: Build de oplossing**

Run:
```
dotnet build Lexica.sln
```
Expected: build succeeds, geen errors.

- [ ] **Step 4: Commit**

```
git add src/Lexica.Core/Entities/Word.cs src/Lexica.Infrastructure/Migrations/
git commit -m "feat(word): voeg herkomst-tracking toe (SourceWordId, OriginalAuthorDisplayName)"
```

---

## Task 2: Zet testproject op

**Files:**
- Create: `tests/Lexica.Core.Tests/Lexica.Core.Tests.csproj`
- Create: `tests/Lexica.Core.Tests/Usings.cs`
- Modify: `Lexica.sln`

- [ ] **Step 1: Maak testproject aan**

Run vanuit repo-root:
```
dotnet new xunit -o tests/Lexica.Core.Tests
```
Expected: nieuw project + boilerplate `UnitTest1.cs`. Verwijder `UnitTest1.cs`.

- [ ] **Step 2: Voeg packages en project references toe**

Run:
```
dotnet add tests/Lexica.Core.Tests/Lexica.Core.Tests.csproj reference src/Lexica.Core/Lexica.Core.csproj
dotnet add tests/Lexica.Core.Tests/Lexica.Core.Tests.csproj reference src/Lexica.Infrastructure/Lexica.Infrastructure.csproj
dotnet add tests/Lexica.Core.Tests/Lexica.Core.Tests.csproj package Microsoft.EntityFrameworkCore.InMemory
```

- [ ] **Step 3: Voeg testproject toe aan solution**

Run:
```
dotnet sln Lexica.sln add tests/Lexica.Core.Tests/Lexica.Core.Tests.csproj
```

- [ ] **Step 4: Verifieer build + dotnet test draait (leeg)**

Run:
```
dotnet test tests/Lexica.Core.Tests/Lexica.Core.Tests.csproj
```
Expected: "Passed!" met 0 tests (geen testbestanden meer na verwijderen `UnitTest1.cs`).

- [ ] **Step 5: Commit**

```
git add tests/ Lexica.sln
git commit -m "test: zet Lexica.Core.Tests project op met xUnit + EF InMemory"
```

---

## Task 3: SetForkService — CopySetAsync (TDD)

**Files:**
- Create: `src/Lexica.Core/Services/SetForkService.cs`
- Create: `tests/Lexica.Core.Tests/SetForkServiceTests.cs`

- [ ] **Step 1: Schrijf het falende test-bestand**

Maak `tests/Lexica.Core.Tests/SetForkServiceTests.cs` aan:

```csharp
using Lexica.Core.Entities;
using Lexica.Core.Enums;
using Lexica.Core.Services;
using Lexica.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Lexica.Core.Tests;

public class SetForkServiceTests
{
    private static AppDbContext NewDb([System.Runtime.CompilerServices.CallerMemberName] string name = "")
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"test-{name}-{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(options);
    }

    private static async Task<(ApplicationUser owner, ApplicationUser subscriber, Set set)> SeedSharedSetAsync(AppDbContext db)
    {
        var owner = new ApplicationUser { Id = Guid.NewGuid(), UserName = "owner", DisplayName = "Owner Name" };
        var subscriber = new ApplicationUser { Id = Guid.NewGuid(), UserName = "sub", DisplayName = "Sub" };
        db.Users.Add(owner);
        db.Users.Add(subscriber);

        var w1 = new Word { Id = Guid.NewGuid(), UserId = owner.Id, Number = 1, Language = Language.Latin, Term = "amare", Translation = "houden van" };
        var w2 = new Word { Id = Guid.NewGuid(), UserId = owner.Id, Number = 2, Language = Language.Latin, Term = "videre", Translation = "zien" };
        db.Words.AddRange(w1, w2);

        var set = new Set { Id = Guid.NewGuid(), UserId = owner.Id, Name = "Les 1", Language = Language.Latin, IsPublic = true };
        set.SetWords.Add(new SetWord { SetId = set.Id, WordId = w1.Id });
        set.SetWords.Add(new SetWord { SetId = set.Id, WordId = w2.Id });
        db.Sets.Add(set);

        db.SetSubscriptions.Add(new SetSubscription { UserId = subscriber.Id, SetId = set.Id });

        // Subscriber heeft al wat progress op w1 (via subscription)
        db.UserWordProgress.Add(new UserWordProgress
        {
            UserId = subscriber.Id, WordId = w1.Id,
            Easiness = 2.8, Interval = 7, Repetitions = 3,
            DueDate = DateTime.UtcNow.Date.AddDays(7), TimesReviewed = 3, Notes = "moeilijk!"
        });

        await db.SaveChangesAsync();
        return (owner, subscriber, set);
    }

    [Fact]
    public async Task CopySetAsync_MaaktDiepeKopieMetNieuweEigenaar()
    {
        using var db = NewDb();
        var (owner, subscriber, set) = await SeedSharedSetAsync(db);
        var service = new SetForkService(db);

        var copy = await service.CopySetAsync(set.Id, subscriber.Id);

        Assert.NotEqual(set.Id, copy.Id);
        Assert.Equal(subscriber.Id, copy.UserId);
        Assert.Equal("Les 1", copy.Name);
        Assert.Equal(Language.Latin, copy.Language);
        Assert.False(copy.IsPublic);

        var copyWords = await db.SetWords.Where(sw => sw.SetId == copy.Id).Include(sw => sw.Word).ToListAsync();
        Assert.Equal(2, copyWords.Count);
        Assert.All(copyWords, sw => Assert.Equal(subscriber.Id, sw.Word.UserId));
        Assert.All(copyWords, sw => Assert.Equal("Owner Name", sw.Word.OriginalAuthorDisplayName));
        Assert.All(copyWords, sw => Assert.NotNull(sw.Word.SourceWordId));
    }

    [Fact]
    public async Task CopySetAsync_NeemtSm2ProgressMee()
    {
        using var db = NewDb();
        var (owner, subscriber, set) = await SeedSharedSetAsync(db);
        var service = new SetForkService(db);

        var copy = await service.CopySetAsync(set.Id, subscriber.Id);

        var copyWords = await db.SetWords.Where(sw => sw.SetId == copy.Id).Include(sw => sw.Word).ToListAsync();
        var amareCopy = copyWords.Single(sw => sw.Word.Term == "amare").Word;

        var progress = await db.UserWordProgress.SingleOrDefaultAsync(p =>
            p.UserId == subscriber.Id && p.WordId == amareCopy.Id);
        Assert.NotNull(progress);
        Assert.Equal(2.8, progress!.Easiness);
        Assert.Equal(7, progress.Interval);
        Assert.Equal(3, progress.Repetitions);
        Assert.Equal("moeilijk!", progress.Notes);
    }

    [Fact]
    public async Task CopySetAsync_ZegtSubscriptionAutomatischOp()
    {
        using var db = NewDb();
        var (owner, subscriber, set) = await SeedSharedSetAsync(db);
        var service = new SetForkService(db);

        await service.CopySetAsync(set.Id, subscriber.Id);

        var stillSubscribed = await db.SetSubscriptions.AnyAsync(s => s.UserId == subscriber.Id && s.SetId == set.Id);
        Assert.False(stillSubscribed);
    }

    [Fact]
    public async Task CopySetAsync_WeigertEigenSet()
    {
        using var db = NewDb();
        var (owner, _, set) = await SeedSharedSetAsync(db);
        var service = new SetForkService(db);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CopySetAsync(set.Id, owner.Id));
    }

    [Fact]
    public async Task CopySetAsync_WeigertGeenToegang()
    {
        using var db = NewDb();
        var (_, _, set) = await SeedSharedSetAsync(db);
        var randomUserId = Guid.NewGuid();
        // Set is publiek (uit Seed), zou wel mogen — maak nu private en probeer opnieuw
        var loaded = await db.Sets.FindAsync(set.Id);
        loaded!.IsPublic = false;
        await db.SaveChangesAsync();

        var service = new SetForkService(db);
        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.CopySetAsync(set.Id, randomUserId));
    }
}
```

- [ ] **Step 2: Run tests om compile-fail te bevestigen**

Run:
```
dotnet test tests/Lexica.Core.Tests/Lexica.Core.Tests.csproj
```
Expected: build FAIL — `SetForkService` bestaat nog niet.

- [ ] **Step 3: Implementeer SetForkService (alleen CopySetAsync)**

Maak `src/Lexica.Core/Services/SetForkService.cs`:

```csharp
using Lexica.Core.Entities;
using Lexica.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Lexica.Core.Services;

public class SetForkService(AppDbContext db)
{
    /// <summary>
    /// Diepe kopie van een set (Set + Words + SetWords + UserWordProgress) naar de huidige gebruiker.
    /// Zegt automatisch de subscription op het origineel op.
    /// </summary>
    public async Task<Set> CopySetAsync(Guid setId, Guid userId)
    {
        var source = await db.Sets
            .Include(s => s.User)
            .Include(s => s.SetWords).ThenInclude(sw => sw.Word)
            .FirstOrDefaultAsync(s =>
                s.Id == setId &&
                (s.IsPublic || s.Subscriptions.Any(sub => sub.UserId == userId)));

        if (source == null) throw new KeyNotFoundException("Set niet gevonden of geen toegang.");
        if (source.UserId == userId) throw new InvalidOperationException("Je bent al eigenaar van deze set.");

        var sourceWordIds = source.SetWords.Select(sw => sw.WordId).ToList();

        // Bestaande progress van de huidige user op deze bron-woorden
        var existingProgress = await db.UserWordProgress
            .Where(p => p.UserId == userId && sourceWordIds.Contains(p.WordId))
            .ToDictionaryAsync(p => p.WordId);

        var newSet = new Set
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = source.Name,
            Language = source.Language,
            DefaultDirection = source.DefaultDirection,
            IsPublic = false,
            Description = source.Description,
            CreatedAt = DateTime.UtcNow
        };
        db.Sets.Add(newSet);

        foreach (var sw in source.SetWords)
        {
            var src = sw.Word;
            var newWord = new Word
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Number = src.Number,
                Language = src.Language,
                Term = src.Term,
                Translation = src.Translation,
                PartOfSpeech = src.PartOfSpeech,
                SourceWordId = src.Id,
                OriginalAuthorDisplayName = source.User.DisplayName,
                CreatedAt = DateTime.UtcNow
            };
            db.Words.Add(newWord);
            db.SetWords.Add(new SetWord { SetId = newSet.Id, WordId = newWord.Id });

            if (existingProgress.TryGetValue(src.Id, out var prog))
            {
                db.UserWordProgress.Add(new UserWordProgress
                {
                    UserId = userId,
                    WordId = newWord.Id,
                    Easiness = prog.Easiness,
                    Interval = prog.Interval,
                    Repetitions = prog.Repetitions,
                    DueDate = prog.DueDate,
                    LastReviewed = prog.LastReviewed,
                    TimesReviewed = prog.TimesReviewed,
                    Notes = prog.Notes
                });
            }
        }

        // Zeg subscription automatisch op
        var sub = await db.SetSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.SetId == setId);
        if (sub != null) db.SetSubscriptions.Remove(sub);

        await db.SaveChangesAsync();
        return newSet;
    }
}
```

**Let op `ApplicationUser`:** als deze geen `DisplayName` property heeft, voeg die toe (string?) — anders moet de snapshot een ander veld gebruiken (`UserName` als fallback). Verifieer via `Read src/Lexica.Core/Entities/ApplicationUser.cs` welke property bestaat; in de testseed wordt `DisplayName` gezet, in productie staat dit op `ApplicationUser`.

- [ ] **Step 4: Run tests om te zien dat ze slagen**

Run:
```
dotnet test tests/Lexica.Core.Tests/Lexica.Core.Tests.csproj
```
Expected: 5 tests, allemaal PASS.

- [ ] **Step 5: Commit**

```
git add src/Lexica.Core/Services/SetForkService.cs tests/Lexica.Core.Tests/SetForkServiceTests.cs
git commit -m "feat(sets): SetForkService.CopySetAsync — diepe kopie met progress + auto-unsubscribe"
```

---

## Task 4: SetForkService — SplitSetAsync (TDD)

**Files:**
- Modify: `src/Lexica.Core/Services/SetForkService.cs`
- Modify: `tests/Lexica.Core.Tests/SetForkServiceTests.cs`

- [ ] **Step 1: Schrijf falende tests**

Voeg toe aan `SetForkServiceTests.cs`:

```csharp
public enum SplitMode { Move, Copy }

// Bovenaan: helper om eigen set met N woorden te seeden
private static async Task<(ApplicationUser user, Set set, List<Word> words)> SeedOwnedSetAsync(AppDbContext db, int wordCount = 4)
{
    var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = "u", DisplayName = "U" };
    db.Users.Add(user);
    var words = new List<Word>();
    for (int i = 1; i <= wordCount; i++)
    {
        var w = new Word { Id = Guid.NewGuid(), UserId = user.Id, Number = i, Language = Language.Latin, Term = $"w{i}", Translation = $"v{i}" };
        words.Add(w);
        db.Words.Add(w);
    }
    var set = new Set { Id = Guid.NewGuid(), UserId = user.Id, Name = "A", Language = Language.Latin };
    foreach (var w in words) set.SetWords.Add(new SetWord { SetId = set.Id, WordId = w.Id });
    db.Sets.Add(set);
    await db.SaveChangesAsync();
    return (user, set, words);
}

[Fact]
public async Task SplitSetAsync_MoveVerplaatstWoordenNaarNieuweSet()
{
    using var db = NewDb();
    var (user, src, words) = await SeedOwnedSetAsync(db, 4);
    var service = new SetForkService(db);
    var ids = words.Take(2).Select(w => w.Id).ToList();

    var newSet = await service.SplitSetAsync(src.Id, user.Id, "B", ids, mode: "move");

    Assert.Equal(user.Id, newSet.UserId);
    Assert.Equal("B", newSet.Name);
    Assert.Equal(Language.Latin, newSet.Language);
    var srcCount = await db.SetWords.CountAsync(sw => sw.SetId == src.Id);
    var newCount = await db.SetWords.CountAsync(sw => sw.SetId == newSet.Id);
    Assert.Equal(2, srcCount);
    Assert.Equal(2, newCount);
}

[Fact]
public async Task SplitSetAsync_CopyLaatBronOngewijzigd()
{
    using var db = NewDb();
    var (user, src, words) = await SeedOwnedSetAsync(db, 4);
    var service = new SetForkService(db);
    var ids = words.Take(2).Select(w => w.Id).ToList();

    var newSet = await service.SplitSetAsync(src.Id, user.Id, "B", ids, mode: "copy");

    var srcCount = await db.SetWords.CountAsync(sw => sw.SetId == src.Id);
    var newCount = await db.SetWords.CountAsync(sw => sw.SetId == newSet.Id);
    Assert.Equal(4, srcCount);
    Assert.Equal(2, newCount);
}

[Fact]
public async Task SplitSetAsync_WeigertNietEigenaar()
{
    using var db = NewDb();
    var (user, src, words) = await SeedOwnedSetAsync(db);
    var service = new SetForkService(db);

    await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
        service.SplitSetAsync(src.Id, Guid.NewGuid(), "B", words.Take(1).Select(w => w.Id).ToList(), "copy"));
}

[Fact]
public async Task SplitSetAsync_WeigertLegeWordIds()
{
    using var db = NewDb();
    var (user, src, _) = await SeedOwnedSetAsync(db);
    var service = new SetForkService(db);

    await Assert.ThrowsAsync<ArgumentException>(() =>
        service.SplitSetAsync(src.Id, user.Id, "B", new List<Guid>(), "copy"));
}
```

- [ ] **Step 2: Run tests om compile-fail te zien**

Run: `dotnet test tests/Lexica.Core.Tests/Lexica.Core.Tests.csproj`
Expected: FAIL — `SplitSetAsync` bestaat niet.

- [ ] **Step 3: Implementeer SplitSetAsync**

Voeg toe aan `SetForkService.cs`:

```csharp
/// <summary>
/// Maakt een nieuwe set met de opgegeven woorden uit een eigen bron-set.
/// mode = "move" verwijdert de SetWord-koppelingen uit de bron; "copy" laat ze staan.
/// </summary>
public async Task<Set> SplitSetAsync(Guid sourceSetId, Guid userId, string newSetName, List<Guid> wordIds, string mode)
{
    if (wordIds == null || wordIds.Count == 0) throw new ArgumentException("Selecteer minstens één woord.");
    if (mode != "move" && mode != "copy") throw new ArgumentException("Mode moet 'move' of 'copy' zijn.");

    var source = await db.Sets
        .Include(s => s.SetWords)
        .FirstOrDefaultAsync(s => s.Id == sourceSetId);
    if (source == null) throw new KeyNotFoundException("Bron-set niet gevonden.");
    if (source.UserId != userId) throw new UnauthorizedAccessException("Niet je eigen set.");

    var newSet = new Set
    {
        Id = Guid.NewGuid(),
        UserId = userId,
        Name = newSetName,
        Language = source.Language,
        DefaultDirection = source.DefaultDirection,
        CreatedAt = DateTime.UtcNow
    };
    db.Sets.Add(newSet);

    var requested = wordIds.ToHashSet();
    foreach (var sw in source.SetWords.Where(sw => requested.Contains(sw.WordId)))
    {
        db.SetWords.Add(new SetWord { SetId = newSet.Id, WordId = sw.WordId });
        if (mode == "move") db.SetWords.Remove(sw);
    }

    await db.SaveChangesAsync();
    return newSet;
}
```

- [ ] **Step 4: Tests groen**

Run: `dotnet test tests/Lexica.Core.Tests/Lexica.Core.Tests.csproj`
Expected: alle 9 tests PASS.

- [ ] **Step 5: Commit**

```
git add src/Lexica.Core/Services/SetForkService.cs tests/Lexica.Core.Tests/SetForkServiceTests.cs
git commit -m "feat(sets): SetForkService.SplitSetAsync — splits set (move/copy)"
```

---

## Task 5: SetForkService — MergeSetsAsync (TDD)

**Files:**
- Modify: `src/Lexica.Core/Services/SetForkService.cs`
- Modify: `tests/Lexica.Core.Tests/SetForkServiceTests.cs`

- [ ] **Step 1: Schrijf falende tests**

Voeg toe aan `SetForkServiceTests.cs`:

```csharp
[Fact]
public async Task MergeSetsAsync_VoegtUniekeWoordenSamen()
{
    using var db = NewDb();
    var (user, setA, wordsA) = await SeedOwnedSetAsync(db, 3);
    // Tweede set met 2 nieuwe woorden + 1 overlappend met setA (deelt eerste word)
    var w4 = new Word { Id = Guid.NewGuid(), UserId = user.Id, Number = 10, Language = Language.Latin, Term = "x", Translation = "y" };
    var w5 = new Word { Id = Guid.NewGuid(), UserId = user.Id, Number = 11, Language = Language.Latin, Term = "x2", Translation = "y2" };
    db.Words.AddRange(w4, w5);
    var setB = new Set { Id = Guid.NewGuid(), UserId = user.Id, Name = "B", Language = Language.Latin };
    setB.SetWords.Add(new SetWord { SetId = setB.Id, WordId = wordsA[0].Id }); // overlap
    setB.SetWords.Add(new SetWord { SetId = setB.Id, WordId = w4.Id });
    setB.SetWords.Add(new SetWord { SetId = setB.Id, WordId = w5.Id });
    db.Sets.Add(setB);
    await db.SaveChangesAsync();

    var service = new SetForkService(db);
    var merged = await service.MergeSetsAsync(user.Id, "Samen", new List<Guid> { setA.Id, setB.Id }, deleteOriginals: false);

    Assert.Equal(user.Id, merged.UserId);
    Assert.Equal(Language.Latin, merged.Language);
    var count = await db.SetWords.CountAsync(sw => sw.SetId == merged.Id);
    Assert.Equal(5, count); // 3 + 3 - 1 overlap
    // Originelen blijven
    Assert.True(await db.Sets.AnyAsync(s => s.Id == setA.Id));
    Assert.True(await db.Sets.AnyAsync(s => s.Id == setB.Id));
}

[Fact]
public async Task MergeSetsAsync_DeleteOriginalsVerwijdertBronnen()
{
    using var db = NewDb();
    var (user, setA, _) = await SeedOwnedSetAsync(db, 2);
    var (_, setB, _) = await SeedOwnedSetAsync(db, 2);
    // Zet beide sets op dezelfde user
    setB.UserId = user.Id;
    await db.SaveChangesAsync();

    var service = new SetForkService(db);
    var merged = await service.MergeSetsAsync(user.Id, "Samen", new List<Guid> { setA.Id, setB.Id }, deleteOriginals: true);

    Assert.False(await db.Sets.AnyAsync(s => s.Id == setA.Id));
    Assert.False(await db.Sets.AnyAsync(s => s.Id == setB.Id));
    Assert.True(await db.Sets.AnyAsync(s => s.Id == merged.Id));
}

[Fact]
public async Task MergeSetsAsync_WeigertVerschillendeTalen()
{
    using var db = NewDb();
    var (user, setA, _) = await SeedOwnedSetAsync(db, 2);
    var setB = new Set { Id = Guid.NewGuid(), UserId = user.Id, Name = "Grieks", Language = Language.Greek };
    db.Sets.Add(setB);
    await db.SaveChangesAsync();

    var service = new SetForkService(db);
    await Assert.ThrowsAsync<InvalidOperationException>(() =>
        service.MergeSetsAsync(user.Id, "X", new List<Guid> { setA.Id, setB.Id }, false));
}

[Fact]
public async Task MergeSetsAsync_WeigertNietEigenaar()
{
    using var db = NewDb();
    var (user, setA, _) = await SeedOwnedSetAsync(db, 2);
    var otherUser = new ApplicationUser { Id = Guid.NewGuid(), UserName = "x" };
    db.Users.Add(otherUser);
    var setB = new Set { Id = Guid.NewGuid(), UserId = otherUser.Id, Name = "X", Language = Language.Latin };
    db.Sets.Add(setB);
    await db.SaveChangesAsync();

    var service = new SetForkService(db);
    await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
        service.MergeSetsAsync(user.Id, "X", new List<Guid> { setA.Id, setB.Id }, false));
}
```

- [ ] **Step 2: Run tests om FAIL te bevestigen**

Run: `dotnet test tests/Lexica.Core.Tests/Lexica.Core.Tests.csproj`
Expected: build FAIL — `MergeSetsAsync` bestaat niet.

- [ ] **Step 3: Implementeer MergeSetsAsync**

Voeg toe aan `SetForkService.cs`:

```csharp
/// <summary>
/// Voegt meerdere eigen sets samen tot één nieuwe set.
/// Alle sets moeten van de gebruiker zijn en dezelfde taal hebben.
/// </summary>
public async Task<Set> MergeSetsAsync(Guid userId, string newSetName, List<Guid> setIds, bool deleteOriginals)
{
    if (setIds == null || setIds.Count < 2) throw new ArgumentException("Selecteer minstens twee sets.");

    var sets = await db.Sets
        .Include(s => s.SetWords)
        .Where(s => setIds.Contains(s.Id))
        .ToListAsync();
    if (sets.Count != setIds.Count) throw new KeyNotFoundException("Eén of meer sets niet gevonden.");
    if (sets.Any(s => s.UserId != userId)) throw new UnauthorizedAccessException("Niet je eigen set.");

    var languages = sets.Select(s => s.Language).Distinct().ToList();
    if (languages.Count > 1) throw new InvalidOperationException("Sets moeten dezelfde taal hebben.");

    var first = sets.First();
    var merged = new Set
    {
        Id = Guid.NewGuid(),
        UserId = userId,
        Name = newSetName,
        Language = first.Language,
        DefaultDirection = first.DefaultDirection,
        CreatedAt = DateTime.UtcNow
    };
    db.Sets.Add(merged);

    var seen = new HashSet<Guid>();
    foreach (var sw in sets.SelectMany(s => s.SetWords))
    {
        if (seen.Add(sw.WordId))
            db.SetWords.Add(new SetWord { SetId = merged.Id, WordId = sw.WordId });
    }

    if (deleteOriginals)
    {
        // Subscriptions op te verwijderen sets ook weg
        var subs = await db.SetSubscriptions.Where(s => setIds.Contains(s.SetId)).ToListAsync();
        db.SetSubscriptions.RemoveRange(subs);
        db.Sets.RemoveRange(sets);
    }

    await db.SaveChangesAsync();
    return merged;
}
```

- [ ] **Step 4: Tests groen**

Run: `dotnet test tests/Lexica.Core.Tests/Lexica.Core.Tests.csproj`
Expected: alle 13 tests PASS.

- [ ] **Step 5: Commit**

```
git add src/Lexica.Core/Services/SetForkService.cs tests/Lexica.Core.Tests/SetForkServiceTests.cs
git commit -m "feat(sets): SetForkService.MergeSetsAsync — voeg meerdere sets samen"
```

---

## Task 6: SetForkService — MoveWordsAsync (TDD)

**Files:**
- Modify: `src/Lexica.Core/Services/SetForkService.cs`
- Modify: `tests/Lexica.Core.Tests/SetForkServiceTests.cs`

- [ ] **Step 1: Schrijf falende tests**

Voeg toe aan `SetForkServiceTests.cs`:

```csharp
[Fact]
public async Task MoveWordsAsync_MoveVerplaatstTussenSets()
{
    using var db = NewDb();
    var (user, setA, wordsA) = await SeedOwnedSetAsync(db, 3);
    var setB = new Set { Id = Guid.NewGuid(), UserId = user.Id, Name = "B", Language = Language.Latin };
    db.Sets.Add(setB);
    await db.SaveChangesAsync();

    var service = new SetForkService(db);
    var idsToMove = wordsA.Take(2).Select(w => w.Id).ToList();
    await service.MoveWordsAsync(user.Id, setA.Id, setB.Id, idsToMove, "move");

    Assert.Equal(1, await db.SetWords.CountAsync(sw => sw.SetId == setA.Id));
    Assert.Equal(2, await db.SetWords.CountAsync(sw => sw.SetId == setB.Id));
}

[Fact]
public async Task MoveWordsAsync_CopyLaatBronOngewijzigd()
{
    using var db = NewDb();
    var (user, setA, wordsA) = await SeedOwnedSetAsync(db, 3);
    var setB = new Set { Id = Guid.NewGuid(), UserId = user.Id, Name = "B", Language = Language.Latin };
    db.Sets.Add(setB);
    await db.SaveChangesAsync();

    var service = new SetForkService(db);
    await service.MoveWordsAsync(user.Id, setA.Id, setB.Id, wordsA.Select(w => w.Id).ToList(), "copy");

    Assert.Equal(3, await db.SetWords.CountAsync(sw => sw.SetId == setA.Id));
    Assert.Equal(3, await db.SetWords.CountAsync(sw => sw.SetId == setB.Id));
}

[Fact]
public async Task MoveWordsAsync_SkipDuplicatesInDoel()
{
    using var db = NewDb();
    var (user, setA, wordsA) = await SeedOwnedSetAsync(db, 3);
    var setB = new Set { Id = Guid.NewGuid(), UserId = user.Id, Name = "B", Language = Language.Latin };
    // setB heeft al wordsA[0]
    setB.SetWords.Add(new SetWord { SetId = setB.Id, WordId = wordsA[0].Id });
    db.Sets.Add(setB);
    await db.SaveChangesAsync();

    var service = new SetForkService(db);
    await service.MoveWordsAsync(user.Id, setA.Id, setB.Id, wordsA.Select(w => w.Id).ToList(), "copy");

    Assert.Equal(3, await db.SetWords.CountAsync(sw => sw.SetId == setB.Id)); // 1 al + 2 nieuw, dupe overgeslagen
}

[Fact]
public async Task MoveWordsAsync_WeigertVerschillendeTalen()
{
    using var db = NewDb();
    var (user, setA, wordsA) = await SeedOwnedSetAsync(db, 1);
    var setB = new Set { Id = Guid.NewGuid(), UserId = user.Id, Name = "Grieks", Language = Language.Greek };
    db.Sets.Add(setB);
    await db.SaveChangesAsync();

    var service = new SetForkService(db);
    await Assert.ThrowsAsync<InvalidOperationException>(() =>
        service.MoveWordsAsync(user.Id, setA.Id, setB.Id, new List<Guid> { wordsA[0].Id }, "move"));
}
```

- [ ] **Step 2: Run tests om FAIL te bevestigen**

Run: `dotnet test tests/Lexica.Core.Tests/Lexica.Core.Tests.csproj`
Expected: build FAIL — `MoveWordsAsync` bestaat niet.

- [ ] **Step 3: Implementeer MoveWordsAsync**

Voeg toe aan `SetForkService.cs`:

```csharp
/// <summary>
/// Verplaatst (move) of kopieert (copy) woorden tussen twee eigen sets met dezelfde taal.
/// Duplicaten in de doel-set worden overgeslagen.
/// </summary>
public async Task MoveWordsAsync(Guid userId, Guid fromSetId, Guid toSetId, List<Guid> wordIds, string mode)
{
    if (wordIds == null || wordIds.Count == 0) throw new ArgumentException("Selecteer minstens één woord.");
    if (mode != "move" && mode != "copy") throw new ArgumentException("Mode moet 'move' of 'copy' zijn.");
    if (fromSetId == toSetId) throw new ArgumentException("Bron en doel mogen niet gelijk zijn.");

    var sets = await db.Sets.Where(s => s.Id == fromSetId || s.Id == toSetId).ToListAsync();
    var from = sets.FirstOrDefault(s => s.Id == fromSetId) ?? throw new KeyNotFoundException("Bron-set niet gevonden.");
    var to = sets.FirstOrDefault(s => s.Id == toSetId) ?? throw new KeyNotFoundException("Doel-set niet gevonden.");
    if (from.UserId != userId || to.UserId != userId) throw new UnauthorizedAccessException("Niet je eigen set.");
    if (from.Language != to.Language) throw new InvalidOperationException("Sets moeten dezelfde taal hebben.");

    var requested = wordIds.ToHashSet();
    var fromSetWords = await db.SetWords.Where(sw => sw.SetId == fromSetId && requested.Contains(sw.WordId)).ToListAsync();
    var existingInTo = await db.SetWords.Where(sw => sw.SetId == toSetId && requested.Contains(sw.WordId))
        .Select(sw => sw.WordId).ToListAsync();
    var existingSet = existingInTo.ToHashSet();

    foreach (var sw in fromSetWords)
    {
        if (!existingSet.Contains(sw.WordId))
            db.SetWords.Add(new SetWord { SetId = toSetId, WordId = sw.WordId });
        if (mode == "move") db.SetWords.Remove(sw);
    }

    await db.SaveChangesAsync();
}
```

- [ ] **Step 4: Tests groen**

Run: `dotnet test tests/Lexica.Core.Tests/Lexica.Core.Tests.csproj`
Expected: alle 17 tests PASS.

- [ ] **Step 5: Commit**

```
git add src/Lexica.Core/Services/SetForkService.cs tests/Lexica.Core.Tests/SetForkServiceTests.cs
git commit -m "feat(sets): SetForkService.MoveWordsAsync — verplaats/kopieer woorden tussen sets"
```

---

## Task 7: Voeg request-DTOs en WordDto-veld toe

**Files:**
- Modify: `src/Lexica.Shared/DTOs/SetDtos.cs`
- Modify: `src/Lexica.Shared/DTOs/WordDtos.cs`

- [ ] **Step 1: Voeg request-records toe aan SetDtos.cs**

Voeg onderaan `src/Lexica.Shared/DTOs/SetDtos.cs` toe:

```csharp
public record SplitSetRequest(
    string Name,
    List<Guid> WordIds,
    string Mode // "move" | "copy"
);

public record MergeSetsRequest(
    string Name,
    List<Guid> SetIds,
    bool DeleteOriginals
);

public record MoveWordsRequest(
    Guid FromSetId,
    Guid ToSetId,
    List<Guid> WordIds,
    string Mode // "move" | "copy"
);
```

- [ ] **Step 2: Voeg OriginalAuthorDisplayName toe aan WordDto**

Wijzig `src/Lexica.Shared/DTOs/WordDtos.cs` — voeg een param toe vóór `IsOwner`:

```csharp
public record WordDto(
    Guid Id,
    int Number,
    string Language,
    string Term,
    string Translation,
    string? PartOfSpeech,
    string? Notes,
    double Easiness,
    int Interval,
    int Repetitions,
    DateTime DueDate,
    DateTime? LastReviewed,
    int TimesReviewed,
    bool IsOwner = true,
    string? OriginalAuthorDisplayName = null
);
```

- [ ] **Step 3: Build de oplossing**

Run: `dotnet build Lexica.sln`
Expected: succesvolle build. **Let op:** als de build faalt door bestaande aanroepers van `new WordDto(...)` (positionele args), dan moet je die call-sites updaten zodat de nieuwe optionele param niet als positional wordt aangeleverd. Zoek met:
```
grep -rn "new WordDto(" src/
```
en pas aanroepen aan waar nodig (waarschijnlijk in `SetsController.GetWords` en `WordsController`).

- [ ] **Step 4: Commit**

```
git add src/Lexica.Shared/DTOs/
git commit -m "feat(dtos): voeg split/merge/move request-records + WordDto.OriginalAuthorDisplayName toe"
```

---

## Task 8: Voeg endpoints toe aan SetsController + DI-registratie

**Files:**
- Modify: `src/Lexica.Api/Controllers/SetsController.cs`
- Modify: `src/Lexica.Api/Program.cs`

- [ ] **Step 1: Registreer SetForkService in DI**

Wijzig `src/Lexica.Api/Program.cs` — voeg toe na de bestaande `AddScoped<ExcelExportService>()` regel:

```csharp
using Lexica.Core.Services;
// ...
builder.Services.AddScoped<ExcelImportService>();
builder.Services.AddScoped<ExcelExportService>();
builder.Services.AddScoped<SetForkService>();
```

- [ ] **Step 2: Inject service in SetsController en voeg endpoints toe**

Wijzig de constructor-declaratie in `src/Lexica.Api/Controllers/SetsController.cs`:

```csharp
public class SetsController(AppDbContext db, SetForkService forkService) : ControllerBase
```

Voeg ook `using Lexica.Core.Services;` bovenaan toe als die nog niet bestaat.

Voeg deze vier endpoints onderaan de class toe (vóór de sluitende `}`):

```csharp
[HttpPost("{id:guid}/copy")]
public async Task<ActionResult<SetDto>> CopySet(Guid id)
{
    try
    {
        var copy = await forkService.CopySetAsync(id, UserId);
        return await Get(copy.Id);
    }
    catch (KeyNotFoundException) { return NotFound(); }
    catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
}

[HttpPost("{id:guid}/split")]
public async Task<ActionResult<SetDto>> SplitSet(Guid id, SplitSetRequest request)
{
    try
    {
        var newSet = await forkService.SplitSetAsync(id, UserId, request.Name, request.WordIds, request.Mode);
        return await Get(newSet.Id);
    }
    catch (KeyNotFoundException) { return NotFound(); }
    catch (UnauthorizedAccessException) { return Forbid(); }
    catch (ArgumentException ex) { return BadRequest(ex.Message); }
    catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
}

[HttpPost("merge")]
public async Task<ActionResult<SetDto>> MergeSets(MergeSetsRequest request)
{
    try
    {
        var merged = await forkService.MergeSetsAsync(UserId, request.Name, request.SetIds, request.DeleteOriginals);
        return await Get(merged.Id);
    }
    catch (KeyNotFoundException) { return NotFound(); }
    catch (UnauthorizedAccessException) { return Forbid(); }
    catch (ArgumentException ex) { return BadRequest(ex.Message); }
    catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
}

[HttpPost("move-words")]
public async Task<IActionResult> MoveWords(MoveWordsRequest request)
{
    try
    {
        await forkService.MoveWordsAsync(UserId, request.FromSetId, request.ToSetId, request.WordIds, request.Mode);
        return NoContent();
    }
    catch (KeyNotFoundException) { return NotFound(); }
    catch (UnauthorizedAccessException) { return Forbid(); }
    catch (ArgumentException ex) { return BadRequest(ex.Message); }
    catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
}
```

- [ ] **Step 3: Projecteer OriginalAuthorDisplayName in GetWords**

In `GetWords` (`SetsController.cs:159-186`), wijzig de `new WordDto(...)` projectie zodat `OriginalAuthorDisplayName` wordt meegestuurd. Vervang het bestaande `Select` met:

```csharp
.Select(w => new WordDto(
    w.Id, w.Number, w.Language.ToString(), w.Term, w.Translation,
    w.PartOfSpeech,
    w.UserProgress.Where(p => p.UserId == UserId).Select(p => p.Notes).FirstOrDefault(),
    w.UserProgress.Where(p => p.UserId == UserId).Select(p => p.Easiness).FirstOrDefault(),
    w.UserProgress.Where(p => p.UserId == UserId).Select(p => p.Interval).FirstOrDefault(),
    w.UserProgress.Where(p => p.UserId == UserId).Select(p => p.Repetitions).FirstOrDefault(),
    w.UserProgress.Where(p => p.UserId == UserId).Select(p => p.DueDate).FirstOrDefault(),
    w.UserProgress.Where(p => p.UserId == UserId).Select(p => p.LastReviewed).FirstOrDefault(),
    w.UserProgress.Where(p => p.UserId == UserId).Select(p => p.TimesReviewed).FirstOrDefault(),
    w.UserId == UserId,
    w.OriginalAuthorDisplayName))
```

Als er andere `new WordDto(...)`-aanroepen elders in controllers staan, vul ook daar het laatste argument met `null` of een passende waarde (alleen relevant voor woorden uit gekopieerde sets — meestal `null`).

- [ ] **Step 4: Build en handmatige smoke-test**

Run: `dotnet build Lexica.sln`
Expected: succesvolle build.

Run de API (`cd src/Lexica.Api && dotnet run --launch-profile https`) en test handmatig met curl/Postman:
- `POST /api/sets/{publicSetId}/copy` met Bearer-token van een andere user → 201/200 + nieuwe SetDto
- Verifieer in DB dat nieuwe Set + Words + SetWords + UserWordProgress zijn aangemaakt
- Verifieer dat SetSubscription is opgezegd

- [ ] **Step 5: Commit**

```
git add src/Lexica.Api/
git commit -m "feat(sets): voeg copy/split/merge/move-words endpoints toe + projectie herkomst"
```

---

## Task 9: Frontend — voeg methodes en DTO-velden toe aan ApiService

**Files:**
- Modify: `src/lexica-frontend/src/app/core/services/api.service.ts`

- [ ] **Step 1: Voeg OriginalAuthorDisplayName toe aan WordDto-interface**

Zoek in `api.service.ts` de `WordDto`-interface (waarschijnlijk onderaan het bestand). Voeg toe:

```typescript
export interface WordDto {
  // ... bestaande velden
  isOwner?: boolean;
  originalAuthorDisplayName?: string | null;
}
```

- [ ] **Step 2: Voeg de 4 nieuwe methodes toe in de Sets-sectie**

Zoek in `api.service.ts` de bestaande `// Sets` sectie (of vergelijkbaar). Voeg toe:

```typescript
copySet(id: string): Observable<SetDto> {
  return this.http.post<SetDto>(`${this.baseUrl}/sets/${id}/copy`, {});
}

splitSet(id: string, request: { name: string; wordIds: string[]; mode: 'move' | 'copy' }): Observable<SetDto> {
  return this.http.post<SetDto>(`${this.baseUrl}/sets/${id}/split`, request);
}

mergeSets(request: { name: string; setIds: string[]; deleteOriginals: boolean }): Observable<SetDto> {
  return this.http.post<SetDto>(`${this.baseUrl}/sets/merge`, request);
}

moveWords(request: { fromSetId: string; toSetId: string; wordIds: string[]; mode: 'move' | 'copy' }): Observable<void> {
  return this.http.post<void>(`${this.baseUrl}/sets/move-words`, request);
}
```

- [ ] **Step 3: Frontend build verifiëren**

Run:
```
cd src/lexica-frontend && npm run build
```
Expected: build succeeds zonder type-errors.

- [ ] **Step 4: Commit**

```
git add src/lexica-frontend/src/app/core/services/api.service.ts
git commit -m "feat(frontend): voeg copy/split/merge/move-words methodes toe aan ApiService"
```

---

## Task 10: Frontend set-detail — "Maak eigen kopie"-knop in owner-banner

**Files:**
- Modify: `src/lexica-frontend/src/app/features/sets/set-detail.component.ts`

- [ ] **Step 1: Lees de huidige owner-banner en pas hem aan**

Lees `set-detail.component.ts` rond regel 60-68 — daar staat de bestaande owner-banner met "Uitschrijven"-knop. Voeg een tweede knop "Maak eigen kopie" toe:

```html
@if (!set.isOwner && set.ownerName) {
  <div class="owner-banner">
    @if (set.ownerPictureUrl) {
      <img [src]="api.resolveUrl(set.ownerPictureUrl)" class="owner-avatar" />
    }
    <span>Set van <strong>{{ set.ownerName }}</strong></span>
    <button class="copy-btn" (click)="copySet()" [disabled]="copying">
      {{ copying ? 'Kopiëren…' : 'Maak eigen kopie' }}
    </button>
    <button class="unsubscribe-btn" (click)="unsubscribe()">Uitschrijven</button>
  </div>
  <p class="copy-hint">Met een eigen kopie kun je woorden bewerken, de set splitsen of samenvoegen.</p>
}
```

- [ ] **Step 2: Voeg de copySet()-methode en `copying`-state toe**

In dezelfde component-class, voeg toe:

```typescript
copying = false;

copySet() {
  if (!this.set || this.copying) return;
  this.copying = true;
  this.api.copySet(this.set.id).subscribe({
    next: (newSet) => {
      this.copying = false;
      // Navigatie naar de nieuwe kopie
      this.router.navigate(['/sets', newSet.id]);
    },
    error: (err) => {
      this.copying = false;
      alert(err.error?.message ?? err.message ?? 'Kopiëren mislukt');
    }
  });
}
```

- [ ] **Step 3: Voeg minimale styling toe**

In hetzelfde bestand, in de `styles:`-sectie:

```css
.copy-btn { background: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
.copy-btn:disabled { opacity: 0.6; cursor: wait; }
.copy-hint { font-size: 0.85em; color: #666; margin-top: 4px; }
```

- [ ] **Step 4: Handmatige smoke test**

Start frontend (`npm start`) + backend, log in als gebruiker B, abonneer op een set van gebruiker A, open de set en klik "Maak eigen kopie". Verwacht: navigatie naar `/sets/<nieuwe-id>`, set verschijnt als eigen set (knoppen voor toevoegen/verwijderen zichtbaar).

- [ ] **Step 5: Commit**

```
git add src/lexica-frontend/src/app/features/sets/set-detail.component.ts
git commit -m "feat(frontend): voeg 'Maak eigen kopie'-knop toe op gedeelde set"
```

---

## Task 11: Frontend set-detail — herkomst-tooltip per woord

**Files:**
- Modify: `src/lexica-frontend/src/app/features/sets/set-detail.component.ts` (en/of `word-item.component.ts`)

- [ ] **Step 1: Inspecteer waar de woordenlijst wordt gerenderd**

Open `src/lexica-frontend/src/app/features/sets/set-detail.component.ts` en zoek de loop over woorden (waarschijnlijk `@for (word of words; ...)` met `<app-word-item>`).

Open ook `src/lexica-frontend/src/app/shared/components/word-item.component.ts` en kijk of het component de hele `WordDto` als input neemt. Zo ja: voeg de herkomstindicator in `word-item.component.ts` toe. Zo nee: voeg het in `set-detail.component.ts` toe als wrapper.

- [ ] **Step 2: Voeg herkomst-badge toe in word-item.component.ts**

In de template van `word-item.component.ts`, naast de term of translation, voeg toe:

```html
@if (word.originalAuthorDisplayName) {
  <span class="origin-badge" [title]="'Origineel van ' + word.originalAuthorDisplayName">
    <i class="fa-solid fa-link"></i>
  </span>
}
```

In de styles:

```css
.origin-badge { color: #888; font-size: 0.8em; margin-left: 6px; }
```

- [ ] **Step 3: Smoke test**

Frontend draait. Open een set die je gekopieerd hebt (zou OriginalAuthorDisplayName per woord moeten hebben). Verwacht: kleine link-icoon naast elk woord; hover toont "Origineel van [naam]".

- [ ] **Step 4: Commit**

```
git add src/lexica-frontend/src/app/shared/components/word-item.component.ts
git commit -m "feat(frontend): toon herkomst-badge bij gekopieerde woorden"
```

---

## Task 12: Frontend set-detail — multi-select op woordenlijst + "verplaats/kopieer naar (nieuwe) set"

**Files:**
- Modify: `src/lexica-frontend/src/app/features/sets/set-detail.component.ts`

- [ ] **Step 1: Voeg select-modus en state toe**

Voeg toe aan de class:

```typescript
selectMode = false;
selectedWordIds = new Set<string>();

toggleSelectMode() {
  this.selectMode = !this.selectMode;
  if (!this.selectMode) this.selectedWordIds.clear();
}

toggleWordSelected(id: string) {
  if (this.selectedWordIds.has(id)) this.selectedWordIds.delete(id);
  else this.selectedWordIds.add(id);
}
```

- [ ] **Step 2: Toon "Selecteer"-knop bij eigen sets en checkboxes in lijst**

In de owner-actiebalk (bij `@if (set.isOwner)`), voeg toe:

```html
<button (click)="toggleSelectMode()">
  {{ selectMode ? 'Annuleer selectie' : 'Selecteer woorden' }}
</button>
```

In de woordenloop, wrap of voeg checkbox toe:

```html
@for (word of words; track word.id) {
  <div class="word-row">
    @if (selectMode) {
      <input type="checkbox"
             [checked]="selectedWordIds.has(word.id)"
             (change)="toggleWordSelected(word.id)" />
    }
    <app-word-item [word]="word"></app-word-item>
  </div>
}
```

- [ ] **Step 3: Voeg actiebalk toe wanneer selectie actief is**

Direct boven of onder de woordenlijst:

```html
@if (selectMode && selectedWordIds.size > 0 && set?.isOwner) {
  <div class="bulk-actions">
    <span>{{ selectedWordIds.size }} geselecteerd</span>
    <button (click)="splitToNewSet('move')">Verplaats naar nieuwe set…</button>
    <button (click)="splitToNewSet('copy')">Kopieer naar nieuwe set…</button>
    <button (click)="moveToExisting('move')">Verplaats naar bestaande set…</button>
    <button (click)="moveToExisting('copy')">Kopieer naar bestaande set…</button>
  </div>
}
```

- [ ] **Step 4: Implementeer splitToNewSet en moveToExisting**

```typescript
splitToNewSet(mode: 'move' | 'copy') {
  if (!this.set) return;
  const name = prompt('Naam voor de nieuwe set:');
  if (!name) return;
  const ids = Array.from(this.selectedWordIds);
  this.api.splitSet(this.set.id, { name, wordIds: ids, mode }).subscribe({
    next: (newSet) => {
      this.selectMode = false;
      this.selectedWordIds.clear();
      this.router.navigate(['/sets', newSet.id]);
    },
    error: (err) => alert(err.error?.message ?? 'Mislukt')
  });
}

moveToExisting(mode: 'move' | 'copy') {
  if (!this.set) return;
  // Eenvoudige picker: laat een lijst van eigen sets met zelfde taal zien
  this.api.getSets(this.set.language).subscribe(allSets => {
    const candidates = allSets.filter(s => s.isOwner && s.id !== this.set!.id);
    if (candidates.length === 0) { alert('Geen andere eigen sets in deze taal.'); return; }
    const labels = candidates.map((s, i) => `${i + 1}: ${s.name}`).join('\n');
    const pick = prompt(`Kies een set (nummer):\n${labels}`);
    const idx = Number(pick) - 1;
    if (isNaN(idx) || idx < 0 || idx >= candidates.length) return;
    const target = candidates[idx];
    const ids = Array.from(this.selectedWordIds);
    this.api.moveWords({ fromSetId: this.set!.id, toSetId: target.id, wordIds: ids, mode }).subscribe({
      next: () => {
        this.selectMode = false;
        this.selectedWordIds.clear();
        this.loadWords(); // bestaande methode die woorden herlaadt; gebruik wat er is
      },
      error: (err) => alert(err.error?.message ?? 'Mislukt')
    });
  });
}
```

**Let op:** `getSets(language)` moet bestaan in `ApiService` (het is `getSets` of `getMySets`). Verifieer in `api.service.ts` welke naam de juiste is en pas aan. `loadWords()` is de bestaande methode in het component — kijk welke naam die heeft (`loadSet`, `loadWords`, of vergelijkbaar) en gebruik die.

- [ ] **Step 5: Smoke test**

Open een eigen set met meerdere woorden. Klik "Selecteer woorden". Vink er 2 aan. Klik "Verplaats naar nieuwe set…" → naam invoeren → navigeer naar nieuwe set met die 2 woorden, originele set heeft ze niet meer. Test ook copy en de "naar bestaande set"-flow.

- [ ] **Step 6: Commit**

```
git add src/lexica-frontend/src/app/features/sets/set-detail.component.ts
git commit -m "feat(frontend): multi-select woorden + splits/verplaats acties op set-detail"
```

---

## Task 13: Frontend set-list — eigen vs geabonneerd label + multi-select sets + "Voeg samen"

**Files:**
- Modify: `src/lexica-frontend/src/app/features/sets/set-list.component.ts`
- Modify: `src/lexica-frontend/src/app/shared/components/set-item.component.ts` (voor het label)

- [ ] **Step 1: Voeg label toe aan set-item**

Open `src/lexica-frontend/src/app/shared/components/set-item.component.ts`. In de template, naast de set-naam, voeg een badge toe:

```html
@if (!set.isOwner) {
  <span class="shared-badge" title="Geabonneerd op set van een andere gebruiker">
    <i class="fa-solid fa-link"></i> Gedeeld
  </span>
} @else {
  <span class="owned-badge"><i class="fa-solid fa-star"></i> Eigen</span>
}
```

Styles:
```css
.shared-badge { color: #888; font-size: 0.75em; margin-left: 8px; }
.owned-badge { color: #2563eb; font-size: 0.75em; margin-left: 8px; }
```

- [ ] **Step 2: Voeg multi-select state toe aan set-list**

In `set-list.component.ts`:

```typescript
selectMode = false;
selectedSetIds = new Set<string>();

toggleSelectMode() {
  this.selectMode = !this.selectMode;
  if (!this.selectMode) this.selectedSetIds.clear();
}

toggleSelected(id: string) {
  if (this.selectedSetIds.has(id)) this.selectedSetIds.delete(id);
  else this.selectedSetIds.add(id);
}

get selectedOwnedSets() {
  return this.sets.filter(s => this.selectedSetIds.has(s.id) && s.isOwner);
}
```

- [ ] **Step 3: Toon "Selecteer"-knop + bulk-actie in "Mijn sets"-tab**

In de template binnen `@if (tab === 'mine')`, vóór de set-list:

```html
<div class="bulk-controls">
  <button (click)="toggleSelectMode()">
    {{ selectMode ? 'Annuleer' : 'Selecteer sets' }}
  </button>
  @if (selectMode && selectedSetIds.size >= 2) {
    <button (click)="mergeSelected()">Voeg {{ selectedSetIds.size }} sets samen…</button>
  }
</div>
```

In de loop, render een checkbox als selectMode aan staat (rond `<app-set-item>`):

```html
@for (set of sets; track set.id) {
  <div class="set-row">
    @if (selectMode && set.isOwner) {
      <input type="checkbox"
             [checked]="selectedSetIds.has(set.id)"
             (change)="toggleSelected(set.id)" />
    }
    <app-set-item [set]="set"></app-set-item>
  </div>
}
```

- [ ] **Step 4: Implementeer mergeSelected()**

```typescript
mergeSelected() {
  const selected = this.selectedOwnedSets;
  if (selected.length < 2) return;
  const languages = new Set(selected.map(s => s.language));
  if (languages.size > 1) {
    alert('Geselecteerde sets moeten dezelfde taal hebben.');
    return;
  }
  const name = prompt('Naam voor de samengevoegde set:');
  if (!name) return;
  const deleteOriginals = confirm('Originele sets verwijderen na samenvoegen?');
  this.api.mergeSets({
    name,
    setIds: selected.map(s => s.id),
    deleteOriginals
  }).subscribe({
    next: (merged) => {
      this.selectMode = false;
      this.selectedSetIds.clear();
      this.loadSets();
    },
    error: (err) => alert(err.error?.message ?? 'Samenvoegen mislukt')
  });
}
```

- [ ] **Step 5: Smoke test**

Open `/sets`. Verwacht: badges "Eigen" / "Gedeeld" zichtbaar. Klik "Selecteer sets", vink 2 eigen sets met dezelfde taal aan, klik "Voeg samen", vul naam in, bevestig of niet "Originelen verwijderen" — nieuwe set verschijnt in de lijst, evt. originelen verdwijnen.

- [ ] **Step 6: Commit**

```
git add src/lexica-frontend/src/app/features/sets/set-list.component.ts src/lexica-frontend/src/app/shared/components/set-item.component.ts
git commit -m "feat(frontend): eigen/gedeeld badge + multi-select sets + samenvoegen"
```

---

## Task 14: End-to-end smoke test

**Files:** geen wijzigingen — alleen verificatie.

- [ ] **Step 1: Volledige build**

Run:
```
dotnet build Lexica.sln
dotnet test tests/Lexica.Core.Tests/Lexica.Core.Tests.csproj
cd src/lexica-frontend && npm run build
```
Expected: alles slaagt.

- [ ] **Step 2: Manueel doorlopen — happy path**

Backend + frontend draaien. Met twee testaccounts (A en B):

1. **A** maakt set "Latijn Les 1" met 6 woorden, zet `IsPublic = true`.
2. **B** ontdekt en abonneert op de set.
3. **B** oefent kort (sessie van 2 woorden) → bouwt SM-2 progress op.
4. **B** opent set, klikt "Maak eigen kopie".
   - Verwacht: navigatie naar nieuwe set met dezelfde 6 woorden, allemaal met "Origineel van A"-tooltip, knoppen voor toevoegen/verwijderen zichtbaar.
   - In DB: nieuwe `Set` + 6 nieuwe `Word`s + 6 `SetWord`s; oude `SetSubscription` weg; `UserWordProgress` voor B op de 2 geoefende woorden gekopieerd naar de nieuwe Word-ids.
5. **B** selecteert 3 woorden in eigen kopie, "Verplaats naar nieuwe set…" → "Les 1a". Originele kopie heeft nu 3 woorden, nieuwe set heeft 3.
6. **B** maakt nog een set "Les 2" met 2 woorden, en in `/sets` selecteert "Les 1a" + "Les 2" → "Voeg samen" → "Examen", aanvinkt "Originelen verwijderen" niet. Examen heeft 5 unieke woorden, beide originelen blijven bestaan.
7. **B** opent "Examen", selecteert 1 woord, "Verplaats naar bestaande set…" → kiest "Les 2". Examen heeft nu 4, Les 2 heeft 3.

- [ ] **Step 3: Manueel doorlopen — foutgevallen**

Test:
- "Maak eigen kopie" op je eigen set → moet ofwel niet zichtbaar zijn (banner verschijnt alleen bij niet-eigenaar) of een nette foutmelding tonen.
- Voeg samen-poging op sets met verschillende talen → foutmelding "Sets moeten dezelfde taal hebben".
- Verplaats naar bestaande set met andere taal → foutmelding.

- [ ] **Step 4: Commit (alleen als er nog losse wijzigingen zijn)**

Als er nog uncommitted aanpassingen zijn na deze smoke test, commit ze:
```
git status
git add -A
git commit -m "fix: kleine smoke-test correcties"
```

---

## Task 15: Documentatie — README aanmaken + CLAUDE.md actualiseren

**Files:**
- Create: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Schrijf `README.md` in de repo-root**

Repo heeft nog geen README. Maak `README.md` met deze inhoud:

```markdown
# Lexica

Webapp voor het studeren van vreemde-taalwoorden (Latijn, Grieks) met SM-2 spaced repetition.

## Stack

- **Backend:** .NET 9 (Clean Architecture: Api / Core / Infrastructure / Shared) + EF Core 9 + PostgreSQL (Npgsql) + JWT-auth + Google Sign-In
- **Frontend:** Angular 17 (standalone components, lazy-loaded routes)
- **Tests:** xUnit + EF Core InMemory (`tests/Lexica.Core.Tests`)

## Opstarten

### Backend
```bash
cd src/Lexica.Api
dotnet run --launch-profile https
```
HTTPS op `https://localhost:7105`, HTTP op `http://localhost:5066`. Migraties worden automatisch toegepast in Development.

### Frontend
```bash
cd src/lexica-frontend
npm start
```
Draait op `http://localhost:4303`, proxy'd naar de backend op `http://localhost:5066`.

### LAN-modus (testen op smartphone)

Zie `CLAUDE.md` voor de exacte stappen.

## Build & test

```bash
dotnet build Lexica.sln
dotnet test tests/Lexica.Core.Tests/Lexica.Core.Tests.csproj
cd src/lexica-frontend && npm run build
```

## Belangrijke features

- Woorden beheren per taal (Latijn / Grieks) met `Number` voor sortering
- **Sets:** groepeer woorden per les, deel publiek, abonneer op andermans sets
- **Eigen kopie van gedeelde set:** fork een gedeelde set tot je eigen onafhankelijke versie (incl. SM-2 progress); splits, voeg samen of verplaats woorden tussen je eigen sets
- Studiesessies met SM-2-algoritme (Snel/Intensief mode)
- Statistieken (XP, level, streak, week/maand-overzicht)
- Excel-import voor bulk-toevoegen van woorden
- PWA-installeerbaar (icon + manifest aanwezig)

## Architectuur kort

Zie `CLAUDE.md` voor controllers, entiteiten, services en frontend-conventies.
```

- [ ] **Step 2: Werk `CLAUDE.md` bij**

Open `CLAUDE.md` en pas drie zaken aan:

**(a) Database-info corrigeren.** Zoek de regel:
> `Database is SQL Server LocalDB (`LexicaDb`). Migrations worden automatisch toegepast in Development (`app.MigrateDatabase()` in Program.cs).`

Vervang door:
> `Database is PostgreSQL (Npgsql). Connection string staat in `appsettings.json` onder `ConnectionStrings:DefaultConnection`. Migraties worden automatisch toegepast in Development via `db.Database.Migrate()` in `Program.cs`.`

**(b) Voeg `SetForkService` toe aan de Controllers/Services-sectie.** In het stukje onder "**Controllers** (`src/Lexica.Api/Controllers/`):", **na** de `ImportController`-regel, voeg toe in de sectie "**Domeinmodel**" of een nieuwe regel onder controllers:

In de bestaande regel:
> `- SM-2 algoritme zit in `Sm2Service` (`src/Lexica.Core/Services/Sm2Service.cs`)`

Voeg een regel toe ernaast:
> `- Fork/split/merge/move-words logica voor sets zit in `SetForkService` (`src/Lexica.Core/Services/SetForkService.cs`)`

Voeg ook bij de `SetsController`-bullet de nieuwe endpoints toe als verwijzing:
> `- `SetsController` — CRUD voor sets, public set discovery, subscriptions, en **fork/split/merge/move-words** (delegeert naar `SetForkService`)`

**(c) Voeg een sectie "Tests draaien" toe.** Onder het kopje "## Opstarten" of "### Build", voeg een nieuw blok toe:

```markdown
### Tests
```bash
dotnet test tests/Lexica.Core.Tests/Lexica.Core.Tests.csproj
```
Tests draaien tegen EF Core InMemory; geen externe database nodig.
```

- [ ] **Step 3: Verifieer dat alles consistent is**

Open `CLAUDE.md` en lees het hele bestand door — zorg dat:
- Geen verwijzing meer naar "SQL Server LocalDB" overblijft
- Het SetForkService bullet/regel correct is toegevoegd
- De `### Tests`-sectie aanwezig is

Open `README.md` en verifieer dat alle commando's en padverwijzingen kloppen met de actuele repo-structuur.

- [ ] **Step 4: Commit**

```
git add README.md CLAUDE.md
git commit -m "docs: voeg README toe en actualiseer CLAUDE.md (PostgreSQL, SetForkService, tests)"
```

---

## Notes

- **Database**: project gebruikt PostgreSQL (Npgsql) — de migratie wordt automatisch toegepast bij `app.MigrateDatabase()` in Program.cs (regels 90-94) bij de eerste start na deployment.
- **CLAUDE.md is verouderd** op het punt van database (vermeldt SQL Server LocalDB; werkelijke connectie is Npgsql). Niet aanpassen tenzij de gebruiker erom vraagt.
- **`ApplicationUser.DisplayName`**: dit veld wordt al gebruikt in bestaande code (zie `SetDto.OwnerName`-projectie); we hergebruiken het voor de snapshot.
- **`OriginalAuthorDisplayName` is een snapshot** — bewust niet via FK, zodat hij blijft bestaan ook als de oorspronkelijke auteur of het bron-woord verwijderd wordt.
- **YAGNI**: geen sync-flow, geen virtuele sets, geen granulaire rechten. Zie spec.
