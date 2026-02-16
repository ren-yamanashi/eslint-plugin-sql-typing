# Overview

Workers for check-sql rule.

This worker runs in a separate thread and handles async database operations.  
It is called synchronously from the main ESLint rule using synckit.
