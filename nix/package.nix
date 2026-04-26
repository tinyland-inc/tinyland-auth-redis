{ pkgs, lib ? pkgs.lib, version ? "0.1.1", packageSrc ? lib.cleanSource ./.. }:

let
  nodejs = pkgs.nodejs_22;
  pnpm = pkgs.pnpm_10 or pkgs.pnpm;
in pkgs.stdenv.mkDerivation {
  pname = "tinyland-auth-redis";
  inherit version;
  src = packageSrc;

  nativeBuildInputs = [ nodejs pnpm pkgs.pnpmConfigHook ];

  pnpmDeps = pkgs.fetchPnpmDeps {
    pname = "tinyland-auth-redis";
    inherit version;
    src = packageSrc;
    inherit pnpm;
    fetcherVersion = 3;
    hash = "sha256-TFrDgNFnKRCbaARINAUwuwk6AY9Xo+CFuINIOA/z9ow=";
  };

  buildPhase = ''
    runHook preBuild
    export HOME="$TMPDIR/home"
    export CI=true
    mkdir -p "$HOME"
    pnpm --config.manage-package-manager-versions=false build
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    package_root="$out/lib/node_modules/@tummycrypt/tinyland-auth-redis"
    mkdir -p "$package_root"
    cp -r dist package.json README.md "$package_root"/
    runHook postInstall
  '';

  meta = with lib; {
    description = "Redis storage adapter for @tummycrypt/tinyland-auth";
    homepage = "https://github.com/tinyland-inc/tinyland-auth-redis";
    license = licenses.mit;
    maintainers = [ ];
    platforms = platforms.unix;
  };
}
