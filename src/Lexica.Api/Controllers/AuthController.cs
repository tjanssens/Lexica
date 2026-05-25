using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Google.Apis.Auth;
using Lexica.Core.Entities;
using Lexica.Core.Services;
using Lexica.Shared.DTOs;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace Lexica.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    IConfiguration configuration,
    IEmailService emailService,
    ILogger<AuthController> logger) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors);

        return Ok(await GenerateToken(user));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null || !await userManager.CheckPasswordAsync(user, request.Password))
            return Unauthorized("Ongeldige inloggegevens.");

        return Ok(await GenerateToken(user));
    }

    [HttpPost("google")]
    public async Task<ActionResult<AuthResponse>> GoogleLogin(GoogleLoginRequest request)
    {
        GoogleJsonWebSignature.Payload payload;
        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = [configuration["Google:ClientId"]!]
            };
            payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken, settings);
        }
        catch (InvalidJwtException)
        {
            return Unauthorized("Ongeldig Google token.");
        }

        var user = await userManager.FindByEmailAsync(payload.Email);
        if (user == null)
        {
            user = new ApplicationUser
            {
                UserName = payload.Email,
                Email = payload.Email,
                EmailConfirmed = true
            };
            var result = await userManager.CreateAsync(user);
            if (!result.Succeeded)
                return BadRequest(result.Errors);
        }

        return Ok(await GenerateToken(user));
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request, CancellationToken ct)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user != null && !string.IsNullOrEmpty(user.PasswordHash))
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            var frontendUrl = configuration["App:FrontendUrl"]?.TrimEnd('/') ?? "";
            var resetUrl = $"{frontendUrl}/reset-password?email={Uri.EscapeDataString(user.Email!)}&token={Uri.EscapeDataString(token)}";

            var html = BuildResetEmailHtml(resetUrl);
            var text = BuildResetEmailText(resetUrl);

            try
            {
                await emailService.SendAsync(user.Email!, "Wachtwoord opnieuw instellen — Lexica", html, text, ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to send password-reset e-mail to {Email}", user.Email);
            }
        }

        // Altijd 200 OK om te voorkomen dat de endpoint te gebruiken is om te checken of een e-mailadres bestaat.
        return Ok();
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
            return BadRequest("Ongeldige of verlopen link. Vraag een nieuwe aan.");

        var result = await userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        if (!result.Succeeded)
        {
            var error = result.Errors.FirstOrDefault();
            if (error?.Code is "InvalidToken" or "InvalidPasswordResetToken")
                return BadRequest("Ongeldige of verlopen link. Vraag een nieuwe aan.");
            return BadRequest(error?.Description ?? "Wachtwoord kon niet worden gewijzigd.");
        }

        return Ok();
    }

    private static string BuildResetEmailHtml(string resetUrl) => $@"
<!DOCTYPE html>
<html><body style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #222; max-width: 560px; margin: 0 auto; padding: 24px;"">
  <h1 style=""color: #0f3460; font-size: 22px; margin-bottom: 16px;"">Wachtwoord opnieuw instellen</h1>
  <p>Je hebt een verzoek gedaan om je wachtwoord voor Lexica opnieuw in te stellen.</p>
  <p>Klik op de onderstaande knop om een nieuw wachtwoord te kiezen. Deze link is <strong>1 uur</strong> geldig.</p>
  <p style=""margin: 28px 0;"">
    <a href=""{resetUrl}"" style=""background: #0f3460; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;"">Nieuw wachtwoord instellen</a>
  </p>
  <p style=""font-size: 13px; color: #666;"">Werkt de knop niet? Kopieer dan deze link in je browser:<br><span style=""word-break: break-all;"">{resetUrl}</span></p>
  <hr style=""border: none; border-top: 1px solid #eee; margin: 24px 0;"">
  <p style=""font-size: 12px; color: #888;"">Heb je dit verzoek niet gedaan? Negeer deze mail dan — je wachtwoord blijft ongewijzigd.</p>
</body></html>";

    private static string BuildResetEmailText(string resetUrl) =>
        $"Wachtwoord opnieuw instellen\n\n" +
        $"Je hebt een verzoek gedaan om je wachtwoord voor Lexica opnieuw in te stellen.\n" +
        $"Open deze link om een nieuw wachtwoord te kiezen (1 uur geldig):\n\n{resetUrl}\n\n" +
        $"Heb je dit verzoek niet gedaan? Negeer deze mail dan.\n";

    private Task<AuthResponse> GenerateToken(ApplicationUser user)
    {
        var jwtSettings = configuration.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
        var expiration = DateTime.UtcNow.AddDays(7);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email!),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: expiration,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );

        return Task.FromResult(new AuthResponse(
            new JwtSecurityTokenHandler().WriteToken(token),
            expiration,
            user.Email!
        ));
    }
}
