---
name: example-skill
description: An example skill demonstrating the skill format for HipHopono.
allowed-tools: read_file, grep, list_dir
---

# Example Skill

This is an example skill that demonstrates how to create skills for HipHopono.

When the user asks about this skill, do the following:

1. Read the project's README.md file if it exists
2. Grep for any TODO comments in the codebase
3. List the top-level directory structure
4. Summarize what you found

## Usage

The user can invoke this skill by typing `/example-skill` in the chat.

## Notes

- Skills can include any instructions for the AI
- The `allowed-tools` field specifies which tools the AI can use when this skill is active
- Skills are loaded from `.skill/`, `.claude/`, `.opencode/`, and other directories
