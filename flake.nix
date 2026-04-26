{
  description =
    "@tummycrypt/tinyland-auth-redis - Redis storage adapter for tinyland-auth";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    let
      packageJson = builtins.fromJSON (builtins.readFile ./package.json);
      overlay = final: prev: {
        tinyland-auth-redis = final.callPackage ./nix/package.nix {
          version = packageJson.version;
        };
      };
    in flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ overlay ];
        };
      in {
        packages.default = pkgs.tinyland-auth-redis;
        packages.tinyland-auth-redis = pkgs.tinyland-auth-redis;

        checks.default = pkgs.tinyland-auth-redis;

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [ bazel_8 nodejs_22 (pnpm_10 or pnpm) ];
          shellHook = ''
            echo "tinyland-auth-redis dev shell"
            echo "  node $(node --version)"
            echo "  pnpm $(pnpm --version)"
            echo "  bazel $(bazel --version | head -n1)"
          '';
        };

        formatter = pkgs.nixfmt-rfc-style;
      }) // {
        overlays.default = overlay;
      };
}
