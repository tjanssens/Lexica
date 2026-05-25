namespace Lexica.Core.Services;

public interface IEmailService
{
    Task SendAsync(string toEmail, string subject, string htmlBody, string textBody, CancellationToken ct = default);
}
