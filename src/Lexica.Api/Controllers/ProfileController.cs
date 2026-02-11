using System.Security.Claims;
using Lexica.Core.Entities;
using Lexica.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Lexica.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfileController(UserManager<ApplicationUser> userManager, IWebHostEnvironment env) : ControllerBase
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
