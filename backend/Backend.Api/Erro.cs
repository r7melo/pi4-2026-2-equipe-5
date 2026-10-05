using Microsoft.AspNetCore.Mvc;

namespace Backend.Api;

// Corpo padrão de erro do contrato: { "error": { "code": "string", "message": "string" } }
public static class Erro
{
    public static object Corpo(string code, string message) => new { error = new { code, message } };

    public static ObjectResult Criar(int status, string code, string message) =>
        new(Corpo(code, message)) { StatusCode = status };
}
