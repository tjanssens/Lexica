namespace Lexica.Shared.DTOs;

public record RegisterRequest(string Email, string Password);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, DateTime Expiration, string Email);
