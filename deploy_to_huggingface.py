"""
Hugging Face Spaces 24/7 Cloud Deployment Helper (Python)
Alternative to PowerShell that works identically with zero shell parser issues.
"""

import subprocess
import sys

def main():
    print("=" * 60)
    print("  THE ABYSSAL CRYPTS 3D - 24/7 CLOUD DEPLOYMENT")
    print("=" * 60)
    print("\nThis script will push your game directly to Hugging Face Spaces")
    print("so it stays ONLINE 24/7 even after your computer is shut down.\n")

    username = input("Enter your Hugging Face username (e.g. johndoe): ").strip()
    if not username:
        print("Error: Username cannot be blank.")
        sys.exit(1)

    space_name = input("Enter your Space name (e.g. abyssal-crypts-3d): ").strip()
    if not space_name:
        print("Error: Space name cannot be blank.")
        sys.exit(1)

    space_url = f"https://huggingface.co/spaces/{username}/{space_name}"
    print(f"\nTarget Remote: {space_url}\n")

    # Check git remote
    remotes = subprocess.run(["git", "remote"], capture_output=True, text=True).stdout.split()
    if "space" in remotes:
        subprocess.run(["git", "remote", "set-url", "space", space_url], check=True)
    else:
        subprocess.run(["git", "remote", "add", "space", space_url], check=True)

    print("Pushing game code to Hugging Face...")
    print("Note: When prompted for password, enter your Hugging Face Access Token (read/write).")
    print("      Get your token at: https://huggingface.co/settings/tokens\n")

    res = subprocess.run(["git", "push", "space", "main", "--force"])
    if res.returncode == 0:
        print("\n" + "=" * 60)
        print(" SUCCESS! DEPLOYMENT INITIATED!")
        print("=" * 60)
        print("Hugging Face is building your 24/7 game container now.\n")
        print(f"Live Space Dashboard: https://huggingface.co/spaces/{username}/{space_name}")
        print(f"Direct Permanent Game URL: https://{username}-{space_name}.hf.space\n")
        print("Your game will now run 24/7 even when your PC is turned off!\n")
    else:
        print("\nPush failed. Make sure:")
        print("1. You created the space at https://huggingface.co/new-space (SDK: Docker -> Blank)")
        print("2. You used a Hugging Face Access Token with WRITE permissions as your password")

if __name__ == "__main__":
    main()
