namespace Lexica.Shared.DTOs;

public record UserProfileDto(string DisplayName, string? ProfilePictureUrl, string Email, bool HasPassword);
public record UpdateProfileRequest(string? DisplayName, string? ProfilePictureUrl);
public record ChangeEmailRequest(string NewEmail, string Password);
public record ChangePasswordRequest(string? CurrentPassword, string NewPassword);
