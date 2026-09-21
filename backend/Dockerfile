# Dockerfile de DESENVOLVIMENTO para o backend ASP.NET Core
FROM mcr.microsoft.com/dotnet/sdk:8.0

WORKDIR /app

# Copia os arquivos de projeto primeiro para cache de restore mais eficiente.
# Quando o(s) .csproj do projeto de API existir(em), o restore roda aqui.
COPY *.sln ./
COPY **/*.csproj ./
RUN dotnet restore || true

COPY . .

EXPOSE 8000

# Troque "Backend.Api" pelo nome real do seu projeto (pasta/.csproj) assim que criá-lo,
# ex: dotnet new webapi -n Backend.Api
CMD ["dotnet", "watch", "run", "--urls", "http://0.0.0.0:8000", "--project", "Backend.Api"]
