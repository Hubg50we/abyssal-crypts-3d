"""
GitHub / GitHub Pages Deployment Helper (Python)
Prompts for GitHub repository URL and pushes the codebase to main branch.
"""

import subprocess
import sys

def main():
    print("=" * 60)
    print("  THE ABYSSAL CRYPTS 3D - GITHUB DEPLOYMENT")
    print("=" * 60)
    print("\nThis script links your local game to your GitHub repository")
    print("and pushes the code so GitHub Pages can host it 24/7 for free.\n")

    repo_url = input("Enter your GitHub repository URL (e.g. https://github.com/username/dungeon-game.git): ").strip()
    if not repo_url:
        print("Error: Repository URL cannot be blank.")
        sys.exit(1)

    # Check git remote
    remotes = subprocess.run(["git", "remote"], capture_output=True, text=True).stdout.split()
    if "origin" in remotes:
        subprocess.run(["git", "remote", "set-url", "origin", repo_url], check=True)
    else:
        subprocess.run(["git", "remote", "add", "origin", repo_url], check=True)

    subprocess.run(["git", "branch", "-M", "main"], check=True)
    print("\nPushing code to GitHub main branch...")
    res = subprocess.run(["git", "push", "-u", "origin", "main", "--force"])

    if res.returncode == 0:
        print("\n" + "=" * 60)
        print(" SUCCESS! CODE PUSHED TO GITHUB!")
        print("=" * 60)
        print("\nTo enable GitHub Pages in 10 seconds:")
        print("1. Go to your repository on GitHub.com")
        print("2. Click: Settings -> Pages")
        print("3. Under 'Build and deployment -> Source':")
        print("   Choose 'GitHub Actions' (Automatic deployment from .github/workflows)")
        print("   OR choose 'Deploy from a branch' -> Branch: main -> Folder: /docs\n")
        print("Your 3D game will stay online 24/7 even when your PC is turned off!\n")
    else:
        print("\nPush failed. Make sure you created the repository on GitHub first.")

if __name__ == "__main__":
    main()
