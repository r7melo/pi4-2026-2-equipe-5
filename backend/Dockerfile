# Dockerfile de DESENVOLVIMENTO para o backend ASP.NET Core
FROM mcr.microsoft.com/dotnet/sdk:8.0

WORKDIR /app

# Copia o .csproj e a migration primeiro para cache de restore mais eficiente.
# O contexto de build é a raiz do repositório para incluir database/.
COPY backend/Backend.Api/Backend.Api.csproj Backend.Api/
COPY database/ /database/
RUN dotnet restore Backend.Api/Backend.Api.csproj

COPY backend/ .

EXPOSE 8000

CMD ["dotnet", "watch", "run", "--urls", "http://0.0.0.0:8000", "--project", "Backend.Api"]
