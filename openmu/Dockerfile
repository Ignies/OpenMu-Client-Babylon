# The official OpenMU image plus our plugins: one extra folder and a startup hook, nothing of OpenMU rebuilt.
ARG OPENMU_IMAGE=munique/openmu:0.9.10

FROM ${OPENMU_IMAGE} AS openmu

FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
COPY --from=openmu /app /openmu
WORKDIR /src
COPY plugins/ ./
RUN dotnet publish MuPlugins.csproj -c Release -o /out -p:OpenMuDir=/openmu

FROM ${OPENMU_IMAGE}
COPY --from=build /out/MUnique.OpenMU.MuPlugins.dll /out/Serilog.Formatting.Compact.dll /app/plugins/
COPY appsettings.Production.json /app/
ENV DOTNET_STARTUP_HOOKS=/app/plugins/MUnique.OpenMU.MuPlugins.dll
