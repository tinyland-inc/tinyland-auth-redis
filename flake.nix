{
  description = "tinyland-auth-redis - Redis storage adapter for tinyland-auth";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20
            corepack
          ];

          shellHook = ''
            echo "tinyland-auth-redis dev shell"
            echo "Node: $(node --version)"
            corepack enable
            corepack prepare pnpm@9.15.9 --activate 2>/dev/null
            echo "pnpm: $(pnpm --version)"
          '';
        };
      }
    );
}
