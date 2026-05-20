using System.Security.Claims;
using System.Text.Json;
using Lexica.Core.Entities;
using Lexica.Infrastructure.Data;
using Lexica.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Lexica.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfileController(
    UserManager<ApplicationUser> userManager,
    AppDbContext db,
    IWebHostEnvironment env) : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    private const long MaxFileSize = 2 * 1024 * 1024; // 2MB

    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<UserProfileDto>> GetProfile()
    {
        var user = await userManager.FindByIdAsync(UserId.ToString());
        if (user == null) return NotFound();

        var hasPassword = await userManager.HasPasswordAsync(user);

        return Ok(new UserProfileDto(
            user.DisplayName ?? "",
            user.ProfilePictureUrl,
            user.Email!,
            hasPassword
        ));
    }

    [HttpPut]
    public async Task<IActionResult> UpdateProfile(UpdateProfileRequest request)
    {
        var user = await userManager.FindByIdAsync(UserId.ToString());
        if (user == null) return NotFound();

        if (request.DisplayName != null)
            user.DisplayName = request.DisplayName.Trim();

        if (request.ProfilePictureUrl != null)
            user.ProfilePictureUrl = string.IsNullOrWhiteSpace(request.ProfilePictureUrl)
                ? null
                : request.ProfilePictureUrl.Trim();

        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(result.Errors);

        return NoContent();
    }

    [HttpPost("picture")]
    public async Task<IActionResult> UploadPicture(IFormFile file)
    {
        if (file.Length == 0) return BadRequest("Geen bestand geüpload.");
        if (file.Length > MaxFileSize) return BadRequest("Bestand is te groot (max 2MB).");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext)) return BadRequest("Ongeldig bestandstype. Gebruik jpg, png, gif of webp.");

        var user = await userManager.FindByIdAsync(UserId.ToString());
        if (user == null) return NotFound();

        // Delete old file if exists
        DeleteProfilePictureFile(UserId);

        var fileName = $"{UserId}{ext}";
        var uploadsDir = Path.Combine(env.WebRootPath, "uploads", "profile-pictures");
        Directory.CreateDirectory(uploadsDir);

        var filePath = Path.Combine(uploadsDir, fileName);
        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        var url = $"/uploads/profile-pictures/{fileName}";
        user.ProfilePictureUrl = url;
        await userManager.UpdateAsync(user);

        return Ok(new { url });
    }

    [HttpDelete("picture")]
    public async Task<IActionResult> DeletePicture()
    {
        var user = await userManager.FindByIdAsync(UserId.ToString());
        if (user == null) return NotFound();

        DeleteProfilePictureFile(UserId);
        user.ProfilePictureUrl = null;
        await userManager.UpdateAsync(user);

        return NoContent();
    }

    private void DeleteProfilePictureFile(Guid userId)
    {
        var uploadsDir = Path.Combine(env.WebRootPath, "uploads", "profile-pictures");
        if (!Directory.Exists(uploadsDir)) return;

        foreach (var ext in AllowedExtensions)
        {
            var path = Path.Combine(uploadsDir, $"{userId}{ext}");
            if (System.IO.File.Exists(path))
                System.IO.File.Delete(path);
        }
    }

    [HttpPut("email")]
    public async Task<IActionResult> ChangeEmail(ChangeEmailRequest request)
    {
        var user = await userManager.FindByIdAsync(UserId.ToString());
        if (user == null) return NotFound();

        // Verify password
        if (!await userManager.CheckPasswordAsync(user, request.Password))
            return BadRequest("Ongeldig wachtwoord.");

        // Check if email is already taken
        var existing = await userManager.FindByEmailAsync(request.NewEmail);
        if (existing != null && existing.Id != user.Id)
            return BadRequest("Dit e-mailadres is al in gebruik.");

        user.Email = request.NewEmail;
        user.UserName = request.NewEmail;
        user.NormalizedEmail = request.NewEmail.ToUpperInvariant();
        user.NormalizedUserName = request.NewEmail.ToUpperInvariant();

        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(result.Errors);

        return NoContent();
    }

    [HttpGet("export-data")]
    public async Task<IActionResult> ExportData()
    {
        var user = await userManager.FindByIdAsync(UserId.ToString());
        if (user == null) return NotFound();

        var userId = user.Id;

        var profile = new
        {
            user.Id,
            user.Email,
            user.DisplayName,
            user.ProfilePictureUrl,
            user.Xp,
            user.Level,
            user.Streak,
            user.LastSessionDate,
            user.StreakFreezeAvailable,
            user.SessionSize,
            user.CreatedAt
        };

        var words = await db.Words
            .Where(w => w.UserId == userId)
            .Select(w => new
            {
                w.Id,
                w.Number,
                Language = w.Language.ToString(),
                w.Term,
                w.Translation,
                w.PartOfSpeech,
                w.SourceWordId,
                w.OriginalAuthorDisplayName,
                w.CreatedAt
            })
            .ToListAsync();

        var groups = await db.Groups
            .Where(g => g.UserId == userId)
            .Select(g => new
            {
                g.Id,
                g.Name,
                Language = g.Language.ToString(),
                DefaultDirection = g.DefaultDirection.ToString(),
                g.CreatedAt,
                WordIds = g.GroupWords.Select(gw => gw.WordId).ToList()
            })
            .ToListAsync();

        var sets = await db.Sets
            .Where(s => s.UserId == userId)
            .Select(s => new
            {
                s.Id,
                s.Name,
                Language = s.Language.ToString(),
                DefaultDirection = s.DefaultDirection.ToString(),
                s.IsPublic,
                s.Description,
                s.CreatedAt,
                WordIds = s.SetWords.Select(sw => sw.WordId).ToList()
            })
            .ToListAsync();

        var subscriptions = await db.SetSubscriptions
            .Where(ss => ss.UserId == userId)
            .Select(ss => new
            {
                ss.SetId,
                SetName = ss.Set.Name,
                ss.SubscribedAt
            })
            .ToListAsync();

        var progress = await db.UserWordProgress
            .Where(p => p.UserId == userId)
            .Select(p => new
            {
                p.WordId,
                p.Easiness,
                p.Interval,
                p.Repetitions,
                p.DueDate,
                p.LastReviewed,
                p.TimesReviewed,
                p.Notes
            })
            .ToListAsync();

        var reviewLogs = await db.ReviewLogs
            .Where(r => r.UserId == userId)
            .Select(r => new
            {
                r.Id,
                r.WordId,
                r.ReviewedAt,
                Direction = r.Direction.ToString(),
                Result = r.Result.ToString(),
                r.EasinessBefore,
                r.EasinessAfter,
                r.IntervalAfter
            })
            .ToListAsync();

        var achievements = await db.Achievements
            .Where(a => a.UserId == userId)
            .Select(a => new { a.Id, a.Type, a.UnlockedAt })
            .ToListAsync();

        var export = new
        {
            exportedAt = DateTime.UtcNow,
            format = "Lexica data export v1",
            note = "Volledige export van persoonsgegevens conform GDPR art. 20 (recht op overdraagbaarheid).",
            profile,
            words,
            groups,
            sets,
            subscriptions,
            wordProgress = progress,
            reviewLogs,
            achievements
        };

        var json = JsonSerializer.SerializeToUtf8Bytes(export, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        var fileName = $"lexica-export-{DateTime.UtcNow:yyyy-MM-dd}.json";
        return File(json, "application/json", fileName);
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest request)
    {
        var user = await userManager.FindByIdAsync(UserId.ToString());
        if (user == null) return NotFound();

        var hasPassword = await userManager.HasPasswordAsync(user);
        if (hasPassword)
        {
            if (string.IsNullOrEmpty(request.Password))
                return BadRequest("Wachtwoord is verplicht ter bevestiging.");
            if (!await userManager.CheckPasswordAsync(user, request.Password))
                return BadRequest("Ongeldig wachtwoord.");
        }

        var userId = user.Id;

        var userWordIds = await db.Words
            .Where(w => w.UserId == userId)
            .Select(w => w.Id)
            .ToListAsync();

        var userSetIds = await db.Sets
            .Where(s => s.UserId == userId)
            .Select(s => s.Id)
            .ToListAsync();

        // Anonimiseer attributies in kopieën die andere gebruikers van deze user's woorden hebben gemaakt
        if (userWordIds.Count > 0)
        {
            await db.Words
                .Where(w => w.SourceWordId.HasValue && userWordIds.Contains(w.SourceWordId.Value))
                .ExecuteUpdateAsync(s => s
                    .SetProperty(w => w.OriginalAuthorDisplayName, _ => "[verwijderde gebruiker]")
                    .SetProperty(w => w.SourceWordId, _ => (Guid?)null));
        }

        // Verwijder in afhankelijkheidsvolgorde — FK-relaties met DeleteBehavior.NoAction expliciet opruimen
        await db.ReviewLogs
            .Where(r => r.UserId == userId || userWordIds.Contains(r.WordId))
            .ExecuteDeleteAsync();

        await db.UserWordProgress
            .Where(p => p.UserId == userId || userWordIds.Contains(p.WordId))
            .ExecuteDeleteAsync();

        if (userWordIds.Count > 0)
        {
            await db.GroupWords
                .Where(gw => userWordIds.Contains(gw.WordId))
                .ExecuteDeleteAsync();

            await db.SetWords
                .Where(sw => userWordIds.Contains(sw.WordId))
                .ExecuteDeleteAsync();
        }

        if (userSetIds.Count > 0)
        {
            await db.SetWords
                .Where(sw => userSetIds.Contains(sw.SetId))
                .ExecuteDeleteAsync();
        }

        await db.SetSubscriptions
            .Where(ss => ss.UserId == userId || userSetIds.Contains(ss.SetId))
            .ExecuteDeleteAsync();

        await db.Sets.Where(s => s.UserId == userId).ExecuteDeleteAsync();
        await db.Groups.Where(g => g.UserId == userId).ExecuteDeleteAsync();
        await db.Words.Where(w => w.UserId == userId).ExecuteDeleteAsync();
        await db.Achievements.Where(a => a.UserId == userId).ExecuteDeleteAsync();

        // Profielfoto wissen
        DeleteProfilePictureFile(userId);

        var result = await userManager.DeleteAsync(user);
        if (!result.Succeeded)
            return BadRequest(result.Errors.First().Description);

        return NoContent();
    }

    [HttpPut("password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var user = await userManager.FindByIdAsync(UserId.ToString());
        if (user == null) return NotFound();

        var hasPassword = await userManager.HasPasswordAsync(user);

        if (hasPassword)
        {
            if (string.IsNullOrEmpty(request.CurrentPassword))
                return BadRequest("Huidig wachtwoord is verplicht.");

            var result = await userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
            if (!result.Succeeded)
                return BadRequest(result.Errors.First().Description);
        }
        else
        {
            // Google-only user setting password for the first time
            var result = await userManager.AddPasswordAsync(user, request.NewPassword);
            if (!result.Succeeded)
                return BadRequest(result.Errors.First().Description);
        }

        return NoContent();
    }
}
