# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RewardRadar is a flight search tool that helps users find award flights across multiple airlines using a 7x7 date grid interface. The project uses browser automation to scrape airline websites and display results in real-time.

## Development Setup

Follow the detailed implementation plan in `prompt_plan.md` which outlines 11 progressive development phases.

## Commands

*To be updated once project is initialized with package.json scripts*

## Architecture

- **Frontend**: HTML/CSS/JS with date grid component and progressive loading
- **Backend**: Node.js/Express with Server-Sent Events for real-time updates  
- **Scraping**: Puppeteer/Playwright with base scraper class and airline-specific implementations
- **Data Flow**: Parallel airline searches → progressive results → grid updates

## Development Guidelines

- Follow iterative development approach from prompt_plan.md
- Implement robust error handling and retry logic for all scrapers
- Use base classes and standardized data formats across airlines
- Prioritize reliability over speed - airline websites are fragile
- Test each airline scraper thoroughly before adding new ones
- Implement proper rate limiting and anti-detection measures