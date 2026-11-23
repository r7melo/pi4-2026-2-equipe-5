using System.Net;
using System.Net.Mail;

namespace Backend.Api;

// Envio de e-mail por SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM).
// Sem SMTP_HOST, em Development o conteúdo vai para o log; em produção só um aviso (sem o conteúdo).
public sealed class Email(IConfiguration config, IHostEnvironment ambiente, ILogger<Email> logger)
{
    // Fora da requisição: falha ou demora no SMTP não muda a resposta (RF-21 responde sempre igual).
    public void EnviarEmSegundoPlano(string para, string assunto, string corpo) => _ = Task.Run(async () =>
    {
        try
        {
            var host = config["SMTP_HOST"];
            if (string.IsNullOrWhiteSpace(host))
            {
                if (ambiente.IsDevelopment())
                    logger.LogInformation("SMTP não configurado. E-mail para {Para}: {Assunto}\n{Corpo}", para, assunto, corpo);
                else
                    logger.LogWarning("SMTP_HOST não configurado: e-mail '{Assunto}' não enviado.", assunto);
                return;
            }
            using var smtp = new SmtpClient(host, int.TryParse(config["SMTP_PORT"], out var porta) ? porta : 587)
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(config["SMTP_USER"], config["SMTP_PASSWORD"]),
            };
            await smtp.SendMailAsync(new MailMessage(config["SMTP_FROM"] ?? config["SMTP_USER"]!, para, assunto, corpo));
        }
        catch (Exception erro)
        {
            logger.LogError(erro, "Falha ao enviar o e-mail '{Assunto}'.", assunto);
        }
    });
}
