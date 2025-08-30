# Telegram Security Bot

## Overview

This is a comprehensive Telegram security bot built with Grammy.js that provides multi-layered protection for Telegram groups. The bot features anti-abuse detection, anti-copyright enforcement, anti-promotion filtering, and global moderation capabilities. It supports multiple languages (English, Hindi, Hinglish) and offers configurable moderation levels to suit different group requirements.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Framework
- **Bot Framework**: Grammy.js with advanced features including bot runner, session management, and comprehensive error handling
- **Architecture Pattern**: Modular handler-based architecture with middleware layers for security, admin verification, and rate limiting
- **Message Processing**: Event-driven architecture handling text messages, media captions, edited messages, and user actions

### Security Middleware Stack
- **Rate Limiting**: Built-in protection against spam with configurable time windows and message limits
- **Flood Protection**: Advanced flood detection with temporary muting capabilities
- **Permission Validation**: Multi-level permission system (bot owner > bot admins > group admins > users)
- **Whitelist System**: Per-group user exemption lists for trusted members

### Content Moderation Engine
- **Advanced Anti-Abuse Module**: 
  - Multi-language profanity detection with severity-based actions (warn, delete, mute, ban)
  - Behavioral pattern analysis tracking user messaging patterns and risk scores
  - Advanced spam detection with message similarity analysis
  - Enhanced toxicity scoring with context-aware content analysis
  - Progressive escalation system based on violation history
  - Mixed-language content detection for improved accuracy
  - Media content moderation for photos, videos, documents, and stickers
  - Real-time user behavior monitoring with automatic risk assessment
  - Advanced text normalization and obfuscation detection to counter bypass attempts
  - Leet speak (1337 speak) detection and character substitution handling
  - Unicode normalization and look-alike character detection
  - Spaced-out text and separator-based obfuscation detection
- **Anti-Copyright Module**: Character limit enforcement and message edit prevention
- **Anti-Promotion Module**: Link detection and blocking for web URLs and Telegram links
- **Moderation Levels**: Configurable security levels (no, weak, moderate, strong, strict) with corresponding action escalation

### Data Storage
- **Database**: In-memory data structures with JSON file persistence for optimal performance
- **Data Models**: Separate collections for groups, users, global bans/mutes, and statistics
- **Backup System**: Automatic periodic backups with manual export capabilities for bot owners

### Global Moderation System
- **Cross-Group Enforcement**: Global ban/mute/kick lists that apply across all groups where the bot operates
- **Admin Hierarchy**: Three-tier admin system (bot owner, bot admins, group admins) with escalating privileges
- **Statistics Tracking**: Comprehensive metrics for messages processed, violations detected, and actions taken

### Server Infrastructure
- **Dual Mode Support**: Both webhook and polling modes for different deployment environments
- **Express.js Integration**: Health check endpoints and webhook handling for production deployments
- **Error Handling**: Comprehensive error handling with detailed logging and graceful degradation

## External Dependencies

### Core Libraries
- **grammy**: Modern Telegram Bot API framework with TypeScript support
- **@grammyjs/ratelimiter**: Rate limiting middleware for spam protection
- **@grammyjs/runner**: Advanced bot runner for high-performance message processing
- **express**: Web server framework for webhook endpoints and health checks

### Language Detection
- **Built-in Wordlists**: Curated profanity databases for English, Hindi, and Hinglish with severity classifications
- **Pattern Matching**: Regex-based content filtering with performance optimization through precompiled patterns

### File System
- **Node.js fs**: For database persistence, logging, and backup functionality
- **JSON Storage**: Simple yet effective data persistence without external database dependencies

### Environment Configuration
- **Process Environment**: Configuration through environment variables for deployment flexibility
- **Default Fallbacks**: Sensible defaults for all configuration options to ensure functionality out-of-the-box