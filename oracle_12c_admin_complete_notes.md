# Oracle Database 12c Administration Workshop
## Complete Educational Reference Notes

---

# TABLE OF CONTENTS

1. [Exploring the Oracle Database Architecture](#chapter-1)
2. [Oracle Database Instance Management](#chapter-2)
3. [Managing Database Storage Structures](#chapter-3)
4. [Administering User Security](#chapter-4)
5. [Managing Schema Objects](#chapter-5)
6. [Managing Data and Concurrency](#chapter-6)
7. [Managing Undo Data](#chapter-7)
8. [Implementing Oracle Database Auditing](#chapter-8)
9. [Database Maintenance](#chapter-9)
10. [Performance Management](#chapter-10)
11. [SQL Tuning](#chapter-11)
12. [Using Database Resource Manager](#chapter-12)
13. [Automating Tasks with Oracle Scheduler](#chapter-13)
14. [Managing Space](#chapter-14)
15. [Oracle Database Backup and Recovery Concepts](#chapter-15)
16. [Performing Database Backups](#chapter-16)
17. [Performing Database Recovery](#chapter-17)
18. [Moving Data](#chapter-18)
19. [Working with Oracle Support (Appendix A)](#appendix-a)

---

# CHAPTER 1: Exploring the Oracle Database Architecture {#chapter-1}

## 1.1 Oracle Database Architecture Overview

An Oracle Database system consists of:
- **Oracle Database**: A set of files on disk (data files, control files, redo log files)
- **Oracle Instance**: Memory structures and background processes that manage the database

Key distinction: The database and instance are separate entities. Multiple instances can access one database (RAC), and one instance manages one database in non-RAC configurations.

## 1.2 Oracle Database Instance Components

### Memory Structures
**System Global Area (SGA)** — Shared memory allocated at instance startup:
- **Database Buffer Cache**: Caches copies of data blocks read from data files. Uses LRU algorithm.
  - Default pool, Keep pool, Recycle pool
  - Buffer states: Unused, Clean (pinned or free), Dirty
- **Redo Log Buffer**: Circular buffer holding redo entries (before they are written to redo log files). Changes recorded as redo entries.
- **Shared Pool**:
  - Library Cache: Stores parsed SQL, PL/SQL code (shared SQL area, private SQL area references)
  - Data Dictionary Cache: Stores data dictionary information
  - Result Cache: Stores results of SQL queries and PL/SQL functions
- **Large Pool**: Optional. Used for UGA (User Global Area) in shared server, RMAN backup/restore, parallel query operations.
- **Java Pool**: Used for Java code and JVM data in the session.
- **Streams Pool**: Used by Oracle Streams and GoldenGate.
- **Fixed SGA**: Internal overhead structures.

**Program Global Area (PGA)** — Private memory for each server process:
- Stack space
- Session information
- Cursor state
- Sort area
- Hash join area

### SGA Sizing Parameters
| Parameter | Description |
|-----------|-------------|
| `SGA_MAX_SIZE` | Maximum size of SGA |
| `SGA_TARGET` | Enables Automatic Shared Memory Management (ASMM) |
| `MEMORY_TARGET` | Enables Automatic Memory Management (AMM) — manages both SGA and PGA |
| `MEMORY_MAX_TARGET` | Maximum total memory |
| `DB_CACHE_SIZE` | Size of default buffer cache |
| `SHARED_POOL_SIZE` | Size of shared pool |
| `LARGE_POOL_SIZE` | Size of large pool |
| `JAVA_POOL_SIZE` | Size of Java pool |
| `STREAMS_POOL_SIZE` | Size of streams pool |

### Process Architecture

**Background Processes** (mandatory):
- **DBWn (Database Writer)**: Writes dirty buffers from database buffer cache to data files. Writes when:
  - Checkpoint occurs
  - Buffer cache is too full (threshold reached)
  - Timeout occurs
- **LGWR (Log Writer)**: Writes redo log buffer to redo log files. Writes when:
  - Transaction commits
  - Redo log buffer is 1/3 full
  - 3 seconds elapse
  - DBWn needs to write dirty buffers
- **CKPT (Checkpoint)**: Updates control file and data file headers with checkpoint information. Signals DBWn.
- **SMON (System Monitor)**: Instance recovery on startup; coalesces free space in data files; reclaims space from temporary segments.
- **PMON (Process Monitor)**: Cleans up failed user processes; releases locks and resources; registers instance with listener.
- **RECO (Recoverer)**: Handles distributed database recovery.
- **ARCn (Archiver)**: Copies online redo log files to archive destinations (only in ARCHIVELOG mode).
- **MMON (Manageability Monitor)**: Collects AWR statistics, performs self-tuning, issues alerts.
- **MMNL (Manageability Monitor Light)**: Performs lightweight MMON tasks more frequently.
- **LREG (Listener Registration)**: Registers instance information with listeners (replaced PMON registration in 12c).

**Optional Background Processes**:
- **CJQ0**: Job queue coordinator
- **Dnnn**: Dispatcher processes (shared server)
- **Snnn**: Shared server processes
- **RVWR**: Recovery Writer (Flashback Database)
- **FBDA**: Flashback Data Archive
- **SMCO**: Space Management Coordinator

**User/Server Processes**:
- Dedicated server: One server process per client connection
- Shared server: Multiple clients share server processes via dispatchers

## 1.3 Oracle Database Storage Structures

### Physical Storage
- **Data Files**: Contain actual database data (tables, indexes, etc.). One or more per tablespace.
- **Control File**: Binary file containing database name, data file/redo log file locations, checkpoint information, SCN (System Change Number), RMAN backup metadata.
- **Online Redo Log Files**: Record all changes to the database. Minimum 2 groups required. Written by LGWR. Reused in circular fashion.
- **Archive Log Files**: Copies of filled online redo log groups (ARCHIVELOG mode).
- **Parameter File (SPFILE/PFILE)**: Database initialization parameters.
- **Password File**: Allows remote SYSDBA/SYSOPER authentication.
- **Alert Log**: Chronological record of database messages, errors, and administrative actions.
- **Trace Files**: Written by background and server processes for diagnostic information.
- **Backup Files**: Created by RMAN.

### Logical Storage
- **Database** > **Tablespace** > **Segment** > **Extent** > **Data Block**

**Data Block**:
- Smallest unit of I/O in Oracle
- Size set at tablespace creation (default 8 KB, defined by `DB_BLOCK_SIZE`)
- Block header: table directory, row directory, free space, row data

**Extent**:
- Contiguous set of data blocks
- Allocated when segment needs more space

**Segment**:
- Set of extents allocated for a specific database object
- Types: Table, Index, Undo, Temporary

**Tablespace**:
- Logical storage unit consisting of one or more data files
- Types:
  - **SYSTEM**: Contains data dictionary
  - **SYSAUX**: Auxiliary to SYSTEM (stores AWR, Enterprise Manager repository, etc.)
  - **TEMP**: Temporary segments for sort operations
  - **UNDO**: Undo segments
  - **USERS**: Default user tablespace

## 1.4 Oracle Net Architecture

- **Oracle Net**: Software layer enabling client-server and server-server communication
- **Listener**: Receives connection requests, hands off to server processes
- **TNS (Transparent Network Substrate)**: Foundation for Oracle Net
- **Oracle Connection Manager (CMAN)**: Multiplexes connections, firewall proxy

### Connection Methods
1. **Dedicated Server**: Each client gets its own server process
2. **Shared Server**: Clients share pool of server processes (configured via DISPATCHERS parameter)
3. **Database Resident Connection Pooling (DRCP)**: Pool of server processes and sessions on the database server side

### Net Configuration Files
- `listener.ora`: Listener configuration
- `tnsnames.ora`: Local naming method (maps connect identifiers to connect descriptors)
- `sqlnet.ora`: Client/server configuration profiles

## 1.5 Oracle Tools

| Tool | Description |
|------|-------------|
| **SQL*Plus** | Command-line interface for SQL and PL/SQL |
| **SQL Developer** | GUI development and administration tool |
| **Enterprise Manager Cloud Control** | Web-based centralized management |
| **Enterprise Manager Database Express** | Lightweight web-based DB management (12c, port 5500) |
| **RMAN** | Recovery Manager for backup and recovery |
| **Data Pump** | High-speed data movement utility |
| **SQL*Loader** | Bulk load utility for external data |
| **OPatch** | Oracle patch utility |

---

# CHAPTER 2: Oracle Database Instance Management {#chapter-2}

## 2.1 Initialization Parameters

### Types
- **Static Parameters**: Require restart to take effect. Stored in PFILE (text) or SPFILE (binary, server-side).
- **Dynamic Parameters**: Can be changed with ALTER SESSION or ALTER SYSTEM without restart.

### SPFILE vs PFILE
| | SPFILE | PFILE |
|--|--------|-------|
| Format | Binary | Text |
| Location | Server-side | Server or client |
| Changed by | ALTER SYSTEM | Manual edit |
| Persistence | Automatic | Manual |
| Preferred | Yes | Legacy |

### Key Initialization Parameters
| Parameter | Description |
|-----------|-------------|
| `DB_NAME` | Database name (max 8 chars) |
| `DB_DOMAIN` | Network domain |
| `DB_BLOCK_SIZE` | Standard block size (2KB-32KB, default 8KB) |
| `MEMORY_TARGET` | Total memory for Oracle to manage |
| `PROCESSES` | Maximum OS processes |
| `DB_CACHE_SIZE` | Buffer cache size |
| `SHARED_POOL_SIZE` | Shared pool size |
| `UNDO_TABLESPACE` | Undo tablespace name |
| `CONTROL_FILES` | List of control file locations |
| `LOG_ARCHIVE_DEST_n` | Archive log destinations |
| `AUDIT_TRAIL` | Auditing destination |
| `ENABLE_PLUGGABLE_DATABASE` | Enable CDB (12c) |
| `DIAGNOSTIC_DEST` | ADR base location |

### ALTER SYSTEM Command Scope
```sql
ALTER SYSTEM SET parameter_name = value SCOPE = {MEMORY | SPFILE | BOTH};
-- MEMORY: Current instance only (not persistent)
-- SPFILE: SPFILE only (persistent, takes effect on restart)
-- BOTH: Current instance and SPFILE (default when SPFILE used)
```

### Viewing Parameters
```sql
SHOW PARAMETER parameter_name;
SELECT name, value, description FROM v$parameter WHERE name LIKE '%parameter%';
SELECT name, value FROM v$spparameter;  -- SPFILE values
```

## 2.2 Starting and Stopping the Database

### Startup Sequence
```
SHUTDOWN → NOMOUNT → MOUNT → OPEN
```

**NOMOUNT**:
- Reads parameter file (SPFILE or PFILE)
- Allocates SGA
- Starts background processes
- Opens alert log

**MOUNT**:
- Reads control file
- Associates control file with data files and redo log files
- Used for: recovery, renaming files, enabling/disabling archive log mode, full database recovery

**OPEN**:
- Opens data files and online redo log files
- Verifies data files and redo logs consistent with control file
- Database available to users

### Startup Commands
```sql
STARTUP;                    -- Full startup to OPEN
STARTUP NOMOUNT;            -- Read SPFILE, start processes
STARTUP MOUNT;              -- + Read control file
STARTUP OPEN;               -- Same as STARTUP
STARTUP RESTRICT;           -- Open, only RESTRICTED SESSION privilege users
STARTUP FORCE;              -- Shutdown abort, then startup
STARTUP PFILE='path/init.ora'; -- Use specific PFILE
```

### Shutdown Modes
| Mode | New Connections | Waits for Sessions | Waits for Transactions | Checkpoint | Fastest |
|------|----------------|-------------------|----------------------|------------|---------|
| NORMAL | No | Yes | Yes | Yes | No |
| TRANSACTIONAL | No | No | Yes | Yes | No |
| IMMEDIATE | No | No | No | Yes | Near |
| ABORT | No | No | No | No | Yes (needs recovery) |

```sql
SHUTDOWN NORMAL;
SHUTDOWN TRANSACTIONAL;
SHUTDOWN IMMEDIATE;
SHUTDOWN ABORT;
```

Note: SHUTDOWN ABORT is the only mode that does NOT perform a clean shutdown. Instance recovery is required on next startup.

## 2.3 Dynamic Performance Views (V$ Views)

V$ views provide real-time instance information. Owned by SYS. Based on X$ fixed tables.

Key V$ Views:
| View | Content |
|------|---------|
| `V$INSTANCE` | Current instance information |
| `V$DATABASE` | Database information from control file |
| `V$PARAMETER` | Current parameter settings |
| `V$SPPARAMETER` | SPFILE parameter settings |
| `V$SGA` | SGA component sizes |
| `V$SGASTAT` | Detailed SGA statistics |
| `V$PROCESS` | OS process information |
| `V$SESSION` | Current session information |
| `V$SQL` | Shared SQL area statements |
| `V$SQLTEXT` | Full SQL text |
| `V$BGPROCESS` | Background process info |
| `V$LOG` | Redo log group info |
| `V$LOGFILE` | Redo log member info |
| `V$DATAFILE` | Data file info from control file |
| `V$CONTROLFILE` | Control file info |
| `V$TABLESPACE` | Tablespace info from control file |
| `V$SYSSTAT` | System-wide statistics |
| `V$SESSTAT` | Per-session statistics |
| `V$STATNAME` | Statistic names |
| `V$EVENT_NAME` | Wait event names |
| `V$SESSION_WAIT` | Current session waits |
| `V$SYSTEM_EVENT` | System-wide wait event statistics |
| `V$DIAG_INFO` | ADR diagnostic paths |

## 2.4 Alert Log and Trace Files

**Alert Log** location:
```
$ORACLE_BASE/diag/rdbms/<db_name>/<instance_name>/trace/alert_<instance_name>.log
```

Contents of alert log:
- Startup/shutdown with parameters
- Non-default parameter values
- Physical structure changes (CREATE, DROP tablespace, data files)
- ORA- errors
- Deadlock errors
- Internal errors (ORA-600, ORA-7445)

### ADR (Automatic Diagnostic Repository)
- Unified directory structure for all diagnostic data
- `DIAGNOSTIC_DEST` parameter sets ADR base
- Default: `$ORACLE_BASE` or `$ORACLE_HOME/log`

ADR Structure:
```
$ADR_BASE/
  diag/
    rdbms/
      <db_name>/
        <instance_name>/
          trace/      -- Alert log and trace files
          incident/   -- Incident dump files
          cdump/      -- Core dump files
          hm/         -- Health monitor results
          sweep/      -- Sweep reports
```

### ADRCI (ADR Command Interpreter)
Command-line tool to view and manage ADR contents:
```bash
adrci
adrci> show homes
adrci> set home diag/rdbms/orcl/orcl
adrci> show alert
adrci> show incident
adrci> show problem
adrci> ips create package problem 1 in /tmp
```

## 2.5 Oracle Enterprise Manager Database Express (EM Express)

- Lightweight, web-based management tool built into Oracle Database 12c
- Accessed at: `https://hostname:5500/em`
- Port configured with: `EXEC DBMS_XDB_CONFIG.SETHTTPSPORT(5500);`
- Does NOT require a separate repository
- Provides: Performance Hub, SQL Monitor, ASH Analytics, configuration, storage management

---

# CHAPTER 3: Managing Database Storage Structures {#chapter-3}

## 3.1 Tablespace Overview

A tablespace is the logical storage unit that bridges logical and physical storage:
- Contains one or more data files (physical)
- Contains database objects (logical)
- Can be online or offline, read-write or read-only

### Tablespace Types
| Type | Purpose |
|------|---------|
| SYSTEM | Data dictionary objects |
| SYSAUX | Auxiliary system data (AWR, EM, etc.) |
| TEMP | Temporary segments for sort/hash operations |
| UNDO | Undo segments for transaction rollback |
| Users-defined | Application data |
| Bigfile | Single large data file (up to 128 TB with 32KB blocks) |
| Smallfile | Multiple data files (traditional, up to 1022 files) |

### Creating Tablespaces
```sql
-- Permanent tablespace
CREATE TABLESPACE users_data
  DATAFILE '/u01/app/oracle/oradata/orcl/users_data01.dbf' SIZE 100M
  AUTOEXTEND ON NEXT 10M MAXSIZE 500M
  EXTENT MANAGEMENT LOCAL AUTOALLOCATE
  SEGMENT SPACE MANAGEMENT AUTO;

-- Temporary tablespace
CREATE TEMPORARY TABLESPACE temp2
  TEMPFILE '/u01/app/oracle/oradata/orcl/temp201.dbf' SIZE 100M
  AUTOEXTEND ON;

-- Undo tablespace
CREATE UNDO TABLESPACE undo2
  DATAFILE '/u01/app/oracle/oradata/orcl/undo201.dbf' SIZE 200M;

-- Bigfile tablespace
CREATE BIGFILE TABLESPACE big_tbs
  DATAFILE '/u01/app/oracle/oradata/orcl/big01.dbf' SIZE 10G;
```

### Modifying Tablespaces
```sql
-- Add a data file
ALTER TABLESPACE users_data
  ADD DATAFILE '/u01/app/oracle/oradata/orcl/users_data02.dbf' SIZE 100M;

-- Resize a data file
ALTER DATABASE DATAFILE '/u01/.../users_data01.dbf' RESIZE 200M;

-- Enable autoextend
ALTER DATABASE DATAFILE '/u01/.../users_data01.dbf'
  AUTOEXTEND ON NEXT 10M MAXSIZE UNLIMITED;

-- Take tablespace offline
ALTER TABLESPACE users_data OFFLINE;
ALTER TABLESPACE users_data OFFLINE IMMEDIATE;

-- Bring online
ALTER TABLESPACE users_data ONLINE;

-- Read-only mode
ALTER TABLESPACE users_data READ ONLY;
ALTER TABLESPACE users_data READ WRITE;

-- Drop tablespace
DROP TABLESPACE users_data INCLUDING CONTENTS AND DATAFILES;
```

### Extent Management
- **Locally Managed Tablespaces (LMT)**: Extent allocation tracked in tablespace bitmap (recommended)
  - `AUTOALLOCATE`: System determines extent sizes (default)
  - `UNIFORM SIZE n`: All extents same size
- **Dictionary Managed Tablespaces (DMT)**: Legacy, tracked in data dictionary

### Segment Space Management
- **Auto**: Uses bitmaps to track free space in segments (recommended)
- **Manual**: Uses freelists (legacy)

## 3.2 Data Files

### Viewing Data File Information
```sql
SELECT file#, name, status, bytes, blocks FROM v$datafile;
SELECT file_name, tablespace_name, bytes, status, autoextensible FROM dba_data_files;
SELECT file_name, tablespace_name, bytes FROM dba_temp_files;  -- Temp files
```

### Moving/Renaming Data Files
In 12c, online move without taking tablespace offline:
```sql
ALTER DATABASE MOVE DATAFILE '/old/path/file.dbf' TO '/new/path/file.dbf';
-- Can also KEEP original (copy) or REUSE existing destination
ALTER DATABASE MOVE DATAFILE '/old/path/file.dbf' TO '/new/path/file.dbf' REUSE KEEP;
```

Traditional method (offline required):
```sql
ALTER TABLESPACE users_data OFFLINE;
-- OS copy/move the file
ALTER TABLESPACE users_data RENAME DATAFILE '/old/path' TO '/new/path';
ALTER TABLESPACE users_data ONLINE;
```

## 3.3 Control Files

### Overview
- Binary file that records physical structure of the database
- Must be mirrored (at least 2, recommend 3) across different disks/controllers
- Updated continuously during operation

### Contents
- Database name and creation timestamp
- Names and locations of data files and online redo log files
- Current redo log sequence number
- Checkpoint information
- SCN (System Change Number)
- RMAN backup metadata

### Multiplexing Control Files
```sql
-- Step 1: Add to CONTROL_FILES parameter (in SPFILE)
ALTER SYSTEM SET CONTROL_FILES = '/path1/ctrl.ctl', '/path2/ctrl.ctl', '/path3/ctrl.ctl' SCOPE=SPFILE;
-- Step 2: Shutdown
SHUTDOWN IMMEDIATE;
-- Step 3: OS copy
-- Step 4: Startup
STARTUP;
```

### Viewing Control File Info
```sql
SELECT name, status FROM v$controlfile;
SHOW PARAMETER control_files;
SELECT * FROM v$controlfile_record_section;  -- Content summary
```

## 3.4 Online Redo Log Files

### Overview
- Record all changes made to the database (for recovery)
- Organized in groups (minimum 2 groups required)
- Each group can have multiple members (mirroring)
- LGWR writes to all members of current group simultaneously
- When a group fills, a log switch occurs (LGWR moves to next group)
- Archiver copies filled groups if in ARCHIVELOG mode

### Log Switch and Checkpoints
- **Log Switch**: LGWR starts writing to next redo log group. Triggers checkpoint.
- **Checkpoint**: DBWn writes dirty buffers to disk. Control file and data file headers updated.

### Log Group States
| State | Meaning |
|-------|---------|
| CURRENT | Currently being written by LGWR |
| ACTIVE | Needed for instance recovery (not yet checkpointed) |
| INACTIVE | No longer needed for instance recovery |
| UNUSED | Never been written to |

### Managing Redo Log Groups
```sql
-- Add a log group
ALTER DATABASE ADD LOGFILE GROUP 4
  ('/u01/redo04a.log', '/u02/redo04b.log') SIZE 50M;

-- Add member to existing group
ALTER DATABASE ADD LOGFILE MEMBER '/u02/redo01b.log' TO GROUP 1;

-- Drop log group (must be INACTIVE)
ALTER DATABASE DROP LOGFILE GROUP 4;

-- Drop member
ALTER DATABASE DROP LOGFILE MEMBER '/u02/redo01b.log';

-- Force log switch
ALTER SYSTEM SWITCH LOGFILE;

-- Force checkpoint
ALTER SYSTEM CHECKPOINT;

-- View log info
SELECT group#, members, status, archived, bytes FROM v$log;
SELECT group#, member, status FROM v$logfile;
```

### Archive Log Mode
```sql
-- Check current mode
SELECT log_mode FROM v$database;
ARCHIVE LOG LIST;

-- Enable archive log mode
SHUTDOWN IMMEDIATE;
STARTUP MOUNT;
ALTER DATABASE ARCHIVELOG;
ALTER DATABASE OPEN;

-- Disable archive log mode
SHUTDOWN IMMEDIATE;
STARTUP MOUNT;
ALTER DATABASE NOARCHIVELOG;
ALTER DATABASE OPEN;
```

### Archive Destinations
```sql
-- Set archive destinations
ALTER SYSTEM SET LOG_ARCHIVE_DEST_1 = 'LOCATION=/u01/archivelog' SCOPE=BOTH;
ALTER SYSTEM SET LOG_ARCHIVE_DEST_2 = 'SERVICE=standby1 LGWR ASYNC' SCOPE=BOTH;
ALTER SYSTEM SET LOG_ARCHIVE_DEST_STATE_1 = ENABLE;

-- View archive log info
SELECT name, sequence#, archived, status FROM v$archived_log;
SELECT dest_id, dest_name, status, target FROM v$archive_dest;
```

---

# CHAPTER 4: Administering User Security {#chapter-4}

## 4.1 User Accounts

### Creating Users
```sql
CREATE USER scott IDENTIFIED BY tiger
  DEFAULT TABLESPACE users
  TEMPORARY TABLESPACE temp
  QUOTA 100M ON users
  QUOTA UNLIMITED ON users2
  ACCOUNT UNLOCK
  PASSWORD EXPIRE;
```

### Modifying Users
```sql
-- Change password
ALTER USER scott IDENTIFIED BY newpassword;

-- Assign tablespace quota
ALTER USER scott QUOTA 200M ON users;
ALTER USER scott QUOTA UNLIMITED ON users;
ALTER USER scott QUOTA 0 ON users;  -- Revokes quota

-- Lock/Unlock account
ALTER USER scott ACCOUNT LOCK;
ALTER USER scott ACCOUNT UNLOCK;

-- Expire password
ALTER USER scott PASSWORD EXPIRE;

-- Change default tablespace
ALTER USER scott DEFAULT TABLESPACE new_tbs;
```

### Dropping Users
```sql
DROP USER scott;           -- Only if user has no objects
DROP USER scott CASCADE;   -- Drops all objects in user's schema
```

### Predefined Administrative Accounts
| Account | Description |
|---------|-------------|
| SYS | Database owner, SYSDBA privilege, owns data dictionary |
| SYSTEM | Administrative account, DBA role |
| SYSBACKUP | For RMAN backup operations (12c new) |
| SYSDG | For Data Guard operations (12c new) |
| SYSKM | For Transparent Data Encryption key management (12c new) |
| ANONYMOUS | Used for HTTP access via Oracle HTTP Server |
| DBSNMP | Used by EM agents for monitoring |
| OUTLN | Supports stored outlines for plan stability |
| SYSMAN | Enterprise Manager repository owner |

### Viewing User Information
```sql
SELECT username, account_status, default_tablespace, created FROM dba_users;
SELECT username, profile, authentication_type FROM dba_users;
SELECT * FROM dba_ts_quotas WHERE username = 'SCOTT';
```

## 4.2 Privileges

### Two Types of Privileges
1. **System Privileges**: Allow users to perform specific database operations
2. **Object Privileges**: Allow users to perform specific operations on specific objects

### System Privileges (key examples)
| Privilege | Action Allowed |
|-----------|---------------|
| `CREATE SESSION` | Connect to database |
| `CREATE TABLE` | Create tables in own schema |
| `CREATE ANY TABLE` | Create tables in any schema |
| `DROP ANY TABLE` | Drop tables in any schema |
| `CREATE PROCEDURE` | Create stored procedures |
| `ALTER SYSTEM` | Modify system parameters |
| `CREATE USER` | Create user accounts |
| `DROP USER` | Drop user accounts |
| `GRANT ANY PRIVILEGE` | Grant any system privilege |
| `SELECT ANY TABLE` | Query any table |
| `EXECUTE ANY PROCEDURE` | Execute any stored procedure |
| `CREATE TABLESPACE` | Create tablespaces |
| `UNLIMITED TABLESPACE` | Use unlimited space in any tablespace |
| `SYSDBA` | Full administrative access |
| `SYSOPER` | Startup, shutdown, basic admin |

### Granting/Revoking System Privileges
```sql
-- Grant system privilege
GRANT CREATE SESSION TO scott;
GRANT CREATE TABLE, CREATE VIEW TO scott;
GRANT DBA TO scott;  -- DBA role includes most privileges

-- Grant with admin option (allows recipient to grant to others)
GRANT CREATE TABLE TO scott WITH ADMIN OPTION;

-- Revoke system privilege
REVOKE CREATE TABLE FROM scott;
-- Note: Revocation of system privileges is NOT cascaded
```

### Object Privileges
| Privilege | Applicable To |
|-----------|--------------|
| SELECT | Tables, views, sequences |
| INSERT | Tables, views |
| UPDATE | Tables, views, columns |
| DELETE | Tables, views |
| ALTER | Tables, sequences |
| EXECUTE | Procedures, functions, packages |
| REFERENCES | Tables (for FK constraints) |
| INDEX | Tables |
| READ | Directories |
| WRITE | Directories |

```sql
-- Grant object privilege
GRANT SELECT ON hr.employees TO scott;
GRANT UPDATE(salary, commission_pct) ON hr.employees TO scott;  -- Column-level
GRANT EXECUTE ON hr.add_job_history TO scott;

-- Grant to all users
GRANT SELECT ON hr.employees TO PUBLIC;

-- Grant with grant option (allows recipient to grant to others)
GRANT SELECT ON hr.employees TO scott WITH GRANT OPTION;

-- Revoke object privilege
REVOKE SELECT ON hr.employees FROM scott;
-- Note: Revocation of object privileges IS cascaded
```

### Administrative Privileges
- **SYSDBA**: Full database control. CREATE DATABASE, STARTUP, SHUTDOWN, ALTER DATABASE, ARCHIVELOG, RECOVERY, CREATE SPFILE.
- **SYSOPER**: Subset of SYSDBA. STARTUP, SHUTDOWN, ALTER DATABASE OPEN/MOUNT, ARCHIVELOG, FLASHBACK DATABASE.
- Authenticated via password file (for remote connections) or OS authentication.

```sql
-- Connect as SYSDBA
CONNECT / AS SYSDBA          -- OS authentication
CONNECT sys/password AS SYSDBA  -- Password file authentication
```

## 4.3 Roles

A role is a named collection of privileges. Simplifies privilege management.

### Predefined Roles
| Role | Description |
|------|-------------|
| `DBA` | Most system privileges; for database administrators |
| `CONNECT` | Legacy role; now only has CREATE SESSION |
| `RESOURCE` | Create basic objects; UNLIMITED TABLESPACE |
| `SELECT_CATALOG_ROLE` | SELECT on data dictionary views |
| `EXECUTE_CATALOG_ROLE` | EXECUTE on data dictionary packages |
| `EXP_FULL_DATABASE` | Perform full database export |
| `IMP_FULL_DATABASE` | Perform full database import |
| `RECOVERY_CATALOG_OWNER` | Own the RMAN recovery catalog |
| `SCHEDULER_ADMIN` | Manage Oracle Scheduler |
| `EM_EXPRESS_BASIC` | Basic EM Express access |
| `EM_EXPRESS_ALL` | Full EM Express access |

### Managing Roles
```sql
-- Create role
CREATE ROLE app_user_role;
CREATE ROLE secure_role IDENTIFIED BY rolepassword;

-- Grant privileges to role
GRANT SELECT, INSERT, UPDATE ON orders TO app_user_role;
GRANT CREATE SESSION TO app_user_role;

-- Grant role to user
GRANT app_user_role TO scott;
GRANT app_user_role TO scott WITH ADMIN OPTION;

-- Set default role
ALTER USER scott DEFAULT ROLE app_user_role;
ALTER USER scott DEFAULT ROLE ALL;
ALTER USER scott DEFAULT ROLE ALL EXCEPT secure_role;
ALTER USER scott DEFAULT ROLE NONE;

-- Enable role in session
SET ROLE app_user_role;
SET ROLE secure_role IDENTIFIED BY rolepassword;
SET ROLE ALL;
SET ROLE NONE;

-- Drop role
DROP ROLE app_user_role;

-- View role info
SELECT * FROM dba_roles;
SELECT * FROM dba_role_privs WHERE grantee = 'SCOTT';
SELECT * FROM role_sys_privs WHERE role = 'DBA';
SELECT * FROM role_tab_privs WHERE role = 'APP_USER_ROLE';
SELECT * FROM session_roles;  -- Roles enabled in current session
```

### Roles vs. Direct Grants
- Roles cannot be used in stored programs (stored procedures, functions, triggers) — directly granted privileges must be used
- Roles are ideal for ad-hoc SQL and interactive sessions
- Roles can be granted to other roles

## 4.4 Profiles

Profiles enforce resource limits and password policies.

### Password Profile Parameters
| Parameter | Description |
|-----------|-------------|
| `FAILED_LOGIN_ATTEMPTS` | Lockout after N failed logins |
| `PASSWORD_LOCK_TIME` | Days account stays locked |
| `PASSWORD_LIFE_TIME` | Days until password expires |
| `PASSWORD_GRACE_TIME` | Grace period after expiry before account locked |
| `PASSWORD_REUSE_TIME` | Days before password can be reused |
| `PASSWORD_REUSE_MAX` | Number of changes before password can be reused |
| `PASSWORD_VERIFY_FUNCTION` | PL/SQL function to validate password complexity |

### Resource Profile Parameters
| Parameter | Description |
|-----------|-------------|
| `SESSIONS_PER_USER` | Max concurrent sessions |
| `CPU_PER_SESSION` | CPU time per session (hundredths of seconds) |
| `CPU_PER_CALL` | CPU time per call |
| `CONNECT_TIME` | Max session elapsed time (minutes) |
| `IDLE_TIME` | Max idle time (minutes) |
| `LOGICAL_READS_PER_SESSION` | Logical reads per session |
| `PRIVATE_SGA` | SGA size for shared server |

Note: Resource limits are enforced only when `RESOURCE_LIMIT = TRUE` parameter is set.

```sql
-- Create profile
CREATE PROFILE app_user_profile LIMIT
  FAILED_LOGIN_ATTEMPTS 3
  PASSWORD_LOCK_TIME 1/24  -- 1 hour (1/24 of a day)
  PASSWORD_LIFE_TIME 90
  PASSWORD_GRACE_TIME 7
  PASSWORD_REUSE_TIME 365
  PASSWORD_REUSE_MAX 10
  PASSWORD_VERIFY_FUNCTION ORA12C_STRONG_PASSWORD_VERIFY_FUNCTION
  SESSIONS_PER_USER 3
  IDLE_TIME 30;

-- Assign profile to user
ALTER USER scott PROFILE app_user_profile;

-- View profiles
SELECT profile, resource_name, limit FROM dba_profiles ORDER BY profile;
SELECT username, profile FROM dba_users;
```

---

# CHAPTER 5: Managing Schema Objects {#chapter-5}

## 5.1 Tables

### Table Types
- **Heap-Organized Table**: Default, rows stored in no particular order
- **Index-Organized Table (IOT)**: Rows stored in B-tree index order by primary key
- **External Table**: Data stored in flat files outside database, accessed via SQL
- **Cluster Table**: Related rows from multiple tables stored in same data blocks
- **Partitioned Table**: Divided into partitions based on column values
- **Temporary Table**: Data exists only for duration of session or transaction

### Creating Tables
```sql
-- Basic table creation
CREATE TABLE employees (
  employee_id   NUMBER(6) PRIMARY KEY,
  first_name    VARCHAR2(20),
  last_name     VARCHAR2(25) NOT NULL,
  email         VARCHAR2(25) UNIQUE,
  hire_date     DATE DEFAULT SYSDATE,
  job_id        VARCHAR2(10) NOT NULL,
  salary        NUMBER(8,2) CHECK (salary > 0),
  department_id NUMBER(4) REFERENCES departments(department_id)
);

-- Create table from query
CREATE TABLE emp_backup AS SELECT * FROM employees;
CREATE TABLE emp_names AS SELECT employee_id, first_name, last_name FROM employees WHERE 1=0;  -- Structure only

-- External table
CREATE TABLE ext_employees (
  employee_id NUMBER,
  first_name  VARCHAR2(20),
  last_name   VARCHAR2(25)
)
ORGANIZATION EXTERNAL (
  TYPE ORACLE_LOADER
  DEFAULT DIRECTORY ext_dir
  ACCESS PARAMETERS (
    RECORDS DELIMITED BY NEWLINE
    FIELDS TERMINATED BY ','
  )
  LOCATION ('employees.csv')
);
```

### Modifying Tables
```sql
-- Add column
ALTER TABLE employees ADD (phone_number VARCHAR2(20));

-- Modify column
ALTER TABLE employees MODIFY (phone_number VARCHAR2(25) NOT NULL);

-- Drop column
ALTER TABLE employees DROP COLUMN phone_number;
ALTER TABLE employees SET UNUSED COLUMN phone_number;  -- Mark as unused
ALTER TABLE employees DROP UNUSED COLUMNS;             -- Remove unused

-- Rename column
ALTER TABLE employees RENAME COLUMN phone_number TO phone;

-- Rename table
ALTER TABLE employees RENAME TO emp_old;
RENAME employees TO emp_old;

-- Add constraint
ALTER TABLE employees ADD CONSTRAINT emp_dept_fk
  FOREIGN KEY (department_id) REFERENCES departments(department_id);

-- Drop constraint
ALTER TABLE employees DROP CONSTRAINT emp_dept_fk;

-- Enable/Disable constraint
ALTER TABLE employees DISABLE CONSTRAINT emp_dept_fk;
ALTER TABLE employees ENABLE CONSTRAINT emp_dept_fk;
ALTER TABLE employees ENABLE NOVALIDATE CONSTRAINT emp_dept_fk;  -- Enable but don't check existing rows

-- Truncate table (removes all rows, DDL, fast)
TRUNCATE TABLE employees;
```

## 5.2 Indexes

### Index Types
- **B-Tree**: Default. Balanced tree structure. Efficient for equality and range queries.
- **Bitmap**: Efficient for low-cardinality columns. Good for data warehousing. Not suitable for OLTP (locking issues).
- **Function-Based**: Built on expression or function result.
- **Unique**: Enforces uniqueness.
- **Composite**: Multiple columns. Column order matters.
- **Reverse Key**: Reverses key bytes. Useful for sequences to distribute inserts.
- **Index-Organized Table (IOT)**: Table stored as index.

### Managing Indexes
```sql
-- Create B-tree index
CREATE INDEX emp_last_name_idx ON employees(last_name);
CREATE UNIQUE INDEX emp_email_uk ON employees(email);
CREATE INDEX emp_name_idx ON employees(last_name, first_name);  -- Composite

-- Bitmap index
CREATE BITMAP INDEX emp_job_bmx ON employees(job_id);

-- Function-based index
CREATE INDEX emp_upper_last_idx ON employees(UPPER(last_name));

-- Invisible index (not used by optimizer but maintained)
CREATE INDEX emp_phone_idx ON employees(phone_number) INVISIBLE;
ALTER INDEX emp_phone_idx VISIBLE;
ALTER INDEX emp_phone_idx INVISIBLE;

-- Rebuild index
ALTER INDEX emp_last_name_idx REBUILD;
ALTER INDEX emp_last_name_idx REBUILD ONLINE;  -- Without locking table

-- Coalesce index (merge leaf blocks)
ALTER INDEX emp_last_name_idx COALESCE;

-- Drop index
DROP INDEX emp_last_name_idx;

-- View index info
SELECT index_name, index_type, status, uniqueness FROM dba_indexes WHERE table_name = 'EMPLOYEES';
SELECT index_name, column_name, column_position FROM dba_ind_columns WHERE table_name = 'EMPLOYEES';
```

## 5.3 Views

```sql
-- Create view
CREATE VIEW emp_dept_view AS
  SELECT e.employee_id, e.first_name, e.last_name, d.department_name
  FROM employees e JOIN departments d ON e.department_id = d.department_id;

-- Create or replace view
CREATE OR REPLACE VIEW emp_dept_view AS ...;

-- View with check option (prevents inserts/updates that wouldn't be visible through view)
CREATE OR REPLACE VIEW emp_dept10_view AS
  SELECT * FROM employees WHERE department_id = 10
  WITH CHECK OPTION CONSTRAINT emp_dept10_ck;

-- Read-only view
CREATE OR REPLACE VIEW emp_names_view AS
  SELECT first_name, last_name FROM employees
  WITH READ ONLY;

-- Drop view
DROP VIEW emp_dept_view;
```

## 5.4 Sequences

```sql
-- Create sequence
CREATE SEQUENCE emp_seq
  START WITH 1
  INCREMENT BY 1
  MAXVALUE 99999999
  NOCYCLE
  CACHE 20;

-- Use sequence
INSERT INTO employees (employee_id, ...) VALUES (emp_seq.NEXTVAL, ...);
SELECT emp_seq.CURRVAL FROM DUAL;

-- Alter sequence
ALTER SEQUENCE emp_seq INCREMENT BY 2;
ALTER SEQUENCE emp_seq CACHE 50;

-- Drop sequence
DROP SEQUENCE emp_seq;
```

## 5.5 Synonyms

```sql
-- Public synonym (accessible to all users)
CREATE PUBLIC SYNONYM employees FOR hr.employees;

-- Private synonym
CREATE SYNONYM my_emp FOR hr.employees;

-- Drop synonym
DROP PUBLIC SYNONYM employees;
DROP SYNONYM my_emp;
```

## 5.6 Constraints

### Constraint Types
| Type | Description |
|------|-------------|
| PRIMARY KEY | Unique + NOT NULL; one per table |
| UNIQUE | Unique values; NULLs allowed |
| NOT NULL | No null values |
| CHECK | Custom condition that rows must satisfy |
| FOREIGN KEY | References parent table's primary/unique key |

### Constraint States
- **ENABLE VALIDATE**: Default. Checked on new data; existing data valid.
- **ENABLE NOVALIDATE**: Checked on new data; existing data not validated.
- **DISABLE VALIDATE**: Not checked; no DML allowed on constrained columns.
- **DISABLE NOVALIDATE**: Not checked; existing data may violate constraint.

### Deferred Constraints
```sql
-- Create deferrable constraint
ALTER TABLE employees ADD CONSTRAINT emp_dept_fk
  FOREIGN KEY (department_id) REFERENCES departments(department_id)
  DEFERRABLE INITIALLY DEFERRED;

-- Change defer mode in session
SET CONSTRAINT emp_dept_fk IMMEDIATE;
SET CONSTRAINT emp_dept_fk DEFERRED;
SET CONSTRAINTS ALL DEFERRED;
```

---

# CHAPTER 6: Managing Data and Concurrency {#chapter-6}

## 6.1 DML Statements

```sql
-- INSERT
INSERT INTO employees VALUES (207, 'John', 'Doe', 'JDOE', NULL, SYSDATE, 'IT_PROG', 5000, NULL, 100, 60);
INSERT INTO employees (employee_id, first_name, last_name) VALUES (208, 'Jane', 'Smith');

-- Multi-table insert
INSERT ALL
  INTO orders_arch SELECT * FROM orders WHERE order_date < DATE '2020-01-01';
INSERT FIRST
  WHEN salary > 10000 THEN INTO high_sal SELECT * FROM employees
  WHEN salary > 5000  THEN INTO mid_sal  SELECT * FROM employees;

-- UPDATE
UPDATE employees SET salary = salary * 1.1 WHERE department_id = 50;

-- DELETE
DELETE FROM employees WHERE department_id = 50;

-- MERGE (upsert)
MERGE INTO employees e
USING new_employees n ON (e.employee_id = n.employee_id)
WHEN MATCHED THEN
  UPDATE SET e.salary = n.salary, e.job_id = n.job_id
WHEN NOT MATCHED THEN
  INSERT (employee_id, first_name, last_name, job_id, salary)
  VALUES (n.employee_id, n.first_name, n.last_name, n.job_id, n.salary);
```

## 6.2 Transaction Management

### Transaction Properties (ACID)
- **Atomicity**: All or nothing
- **Consistency**: Database moves from one valid state to another
- **Isolation**: Transactions are isolated from each other
- **Durability**: Committed changes are permanent

### Transaction Control
```sql
COMMIT;             -- Make changes permanent
ROLLBACK;           -- Undo all changes since last COMMIT
ROLLBACK TO SAVEPOINT sp1;  -- Undo to savepoint
SAVEPOINT sp1;      -- Create savepoint

-- DDL (CREATE, DROP, ALTER, TRUNCATE) causes implicit COMMIT
-- Connection failure causes implicit ROLLBACK
```

## 6.3 Locking and Concurrency

### Oracle Locking Mechanism
- Oracle uses **row-level locking** (TX locks) for DML
- **No dirty reads**: Oracle never reads uncommitted data
- **Readers don't block writers**: Queries use undo data (multiversion read consistency)
- **Writers don't block readers**: Readers see consistent snapshot via undo

### Lock Types
| Lock Type | Description |
|-----------|-------------|
| **DML Locks (TX)** | Row-level transaction locks; acquired automatically on modified rows |
| **DDL Locks (TM)** | Table-level locks during DML to prevent concurrent DDL |
| **Latch** | Low-level internal serialization mechanism |
| **Mutex** | Lightweight latch alternative |

### Table Lock Modes (TM)
| Mode | Description |
|------|-------------|
| RS (Row Share) | SELECT FOR UPDATE; allows concurrent DML |
| RX (Row Exclusive) | INSERT/UPDATE/DELETE; allows concurrent DML |
| S (Share) | Allows concurrent queries only |
| SRX (Share Row Exclusive) | Allows concurrent queries; no other share locks |
| X (Exclusive) | Full exclusive access; no concurrent access |

### Deadlocks
- Oracle automatically detects deadlocks and resolves by rolling back one statement
- ORA-00060 error is reported to the session whose statement was rolled back

### Viewing Locks
```sql
SELECT l.session_id, l.lock_type, l.mode_held, l.mode_requested
FROM v$lock l;

SELECT s.username, s.sid, l.type, l.mode_held
FROM v$session s, v$lock l
WHERE s.sid = l.sid;
```

---

# CHAPTER 7: Managing Undo Data {#chapter-7}

## 7.1 Undo Overview

Undo (formerly rollback) data serves three purposes:
1. **Transaction Rollback**: Undo uncommitted changes
2. **Read Consistency**: Provide consistent reads via multiversion concurrency
3. **Flashback Operations**: Enable Flashback Query and other flashback features

## 7.2 Automatic Undo Management (AUM)

Oracle 12c uses Automatic Undo Management exclusively:
- One active undo tablespace per instance
- Oracle automatically allocates undo segments
- DBA sets retention period, Oracle manages the rest

### Undo Configuration Parameters
| Parameter | Description |
|-----------|-------------|
| `UNDO_MANAGEMENT` | AUTO (default) or MANUAL |
| `UNDO_TABLESPACE` | Name of undo tablespace to use |
| `UNDO_RETENTION` | Minimum retention period (seconds, default 900) |

### Undo Retention
- `UNDO_RETENTION` specifies how long Oracle tries to retain undo data after commit
- Older undo can still be overwritten if space is needed
- **RETENTION GUARANTEE**: Forces retention; undo space never overwritten before expiry
  ```sql
  ALTER TABLESPACE undotbs1 RETENTION GUARANTEE;
  ALTER TABLESPACE undotbs1 RETENTION NOGUARANTEE;
  ```

### Undo Tablespace Management
```sql
-- Create undo tablespace
CREATE UNDO TABLESPACE undotbs2
  DATAFILE '/u01/app/oracle/oradata/orcl/undotbs201.dbf' SIZE 200M
  AUTOEXTEND ON;

-- Switch undo tablespace
ALTER SYSTEM SET UNDO_TABLESPACE = undotbs2;

-- View undo info
SELECT tablespace_name, status, contents FROM dba_tablespaces WHERE contents = 'UNDO';
SELECT usn, name, status, extents, blocks FROM v$rollstat;
SELECT * FROM v$undostat;          -- Undo statistics (history)
SELECT * FROM v$transaction;       -- Active transactions and undo usage
```

### Analyzing Undo Needs
```sql
-- Undo Advisor: estimate needed undo size
SELECT d.name, u.maxquerylen, u.tuned_undoretention
FROM v$undostat u, v$database d
WHERE ROWNUM = 1;
```

### Common Undo Error
- **ORA-01555 (Snapshot Too Old)**: Occurs when undo data needed for read consistency has been overwritten.
  - Solution: Increase `UNDO_RETENTION`, increase undo tablespace size, or use RETENTION GUARANTEE.

---

# CHAPTER 8: Implementing Oracle Database Auditing {#chapter-8}

## 8.1 Auditing Overview

Oracle provides three auditing methods:
1. **Standard Auditing**: Audits specific statements, privileges, and objects
2. **Fine-Grained Auditing (FGA)**: Audits based on content (WHERE clause conditions)
3. **Unified Auditing** (12c): Single framework integrating all audit types

## 8.2 Unified Auditing (Oracle 12c)

Introduced in Oracle 12c as the preferred auditing method:
- Consolidates standard, fine-grained, SYS, and RMAN auditing
- Audit records stored in `UNIFIED_AUDIT_TRAIL` view
- Uses audit policies defined with `CREATE AUDIT POLICY`
- Always-on, cannot be disabled for certain critical operations

### Checking Unified Audit Status
```sql
SELECT value FROM v$option WHERE parameter = 'Unified Auditing';
-- VALUE = TRUE means fully unified auditing enabled
```

### Creating Audit Policies
```sql
-- Audit specific privilege
CREATE AUDIT POLICY audit_create_session
  PRIVILEGES CREATE SESSION;

-- Audit specific action on object
CREATE AUDIT POLICY audit_emp_changes
  ACTIONS INSERT, UPDATE, DELETE ON hr.employees;

-- Audit actions with condition
CREATE AUDIT POLICY audit_salary_changes
  ACTIONS UPDATE ON hr.employees
  WHEN 'SYS_CONTEXT(''USERENV'',''SESSION_USER'') != ''HR'''
  EVALUATE PER SESSION;

-- Audit system action
CREATE AUDIT POLICY audit_user_mgmt
  ACTIONS CREATE USER, DROP USER, ALTER USER;
```

### Enabling/Disabling Policies
```sql
AUDIT POLICY audit_create_session;
AUDIT POLICY audit_emp_changes BY hr, scott;    -- Specific users
AUDIT POLICY audit_emp_changes EXCEPT hr;       -- Exclude user
AUDIT POLICY audit_emp_changes WHENEVER SUCCESSFUL;
AUDIT POLICY audit_emp_changes WHENEVER NOT SUCCESSFUL;

NOAUDIT POLICY audit_create_session;
```

### Viewing Audit Data
```sql
SELECT dbusername, action_name, object_name, unified_audit_policies, event_timestamp
FROM unified_audit_trail
WHERE dbusername = 'SCOTT'
ORDER BY event_timestamp DESC;
```

### Managing Audit Trail
```sql
-- Clean up audit trail
EXEC DBMS_AUDIT_MGMT.CLEAN_AUDIT_TRAIL(
  audit_trail_type  => DBMS_AUDIT_MGMT.AUDIT_TRAIL_UNIFIED,
  use_last_arch_timestamp => FALSE
);
```

## 8.3 Standard Auditing (Pre-12c / Mixed Mode)

```sql
-- Enable auditing (AUDIT_TRAIL parameter)
-- DB: Store in AUD$ table (SYS schema)
-- OS: Store in OS files
-- XML: Store in XML format
-- EXTENDED: DB + SQL text and bind variables
ALTER SYSTEM SET AUDIT_TRAIL = DB, EXTENDED SCOPE=SPFILE;
-- Restart required

-- Audit statements
AUDIT CREATE TABLE;                     -- Privilege audit
AUDIT SELECT ON hr.employees;           -- Object audit
AUDIT SELECT TABLE BY scott;            -- User-specific
AUDIT SELECT ON hr.employees BY ACCESS; -- Audit every access
AUDIT SELECT ON hr.employees BY SESSION; -- Audit once per session

-- Stop auditing
NOAUDIT CREATE TABLE;
NOAUDIT SELECT ON hr.employees;

-- View audit records
SELECT os_username, username, obj_name, action_name, timestamp FROM dba_audit_trail;
SELECT * FROM dba_stmt_audit_opts;    -- Statement audit options
SELECT * FROM dba_priv_audit_opts;    -- Privilege audit options
SELECT * FROM dba_obj_audit_opts;     -- Object audit options
```

## 8.4 Fine-Grained Auditing (FGA)

```sql
-- Add FGA policy
EXEC DBMS_FGA.ADD_POLICY(
  object_schema   => 'HR',
  object_name     => 'EMPLOYEES',
  policy_name     => 'AUD_HIGH_SALARY',
  audit_condition => 'SALARY > 10000',
  audit_column    => 'SALARY',
  handler_schema  => NULL,
  handler_module  => NULL,
  enable          => TRUE,
  statement_types => 'SELECT'
);

-- View FGA audit records
SELECT db_user, object_name, sql_text FROM dba_fga_audit_trail;

-- Drop FGA policy
EXEC DBMS_FGA.DROP_POLICY('HR', 'EMPLOYEES', 'AUD_HIGH_SALARY');
```

## 8.5 Auditing Best Practices

- Always audit SYSDBA and SYSOPER connections (always audited to OS)
- Audit privileged user activity (DBA accounts)
- Audit failed logins (potential intrusion attempts)
- Audit access to sensitive tables
- Regularly review and archive audit data
- Protect the audit trail from modification
- Use FGA for content-sensitive auditing requirements

---

# CHAPTER 9: Database Maintenance {#chapter-9}

## 9.1 Proactive Maintenance: Statistics

### Optimizer Statistics
The Cost-Based Optimizer (CBO) uses statistics to choose execution plans:
- **Table statistics**: Row count, block count, average row length
- **Column statistics**: Distinct values, nulls, min/max, histograms
- **Index statistics**: Levels, leaf blocks, distinct keys, clustering factor
- **System statistics**: CPU speed, I/O throughput

### Gathering Statistics with DBMS_STATS
```sql
-- Gather statistics on schema
EXEC DBMS_STATS.GATHER_SCHEMA_STATS('HR');

-- Gather statistics on table
EXEC DBMS_STATS.GATHER_TABLE_STATS('HR', 'EMPLOYEES');

-- Gather statistics on table with options
EXEC DBMS_STATS.GATHER_TABLE_STATS(
  ownname          => 'HR',
  tabname          => 'EMPLOYEES',
  estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,
  method_opt       => 'FOR ALL COLUMNS SIZE AUTO',
  cascade          => TRUE,      -- Also gather index stats
  degree           => 4          -- Parallel degree
);

-- Gather database statistics
EXEC DBMS_STATS.GATHER_DATABASE_STATS();

-- Gather fixed object statistics (X$ tables)
EXEC DBMS_STATS.GATHER_FIXED_OBJECTS_STATS();

-- Gather dictionary statistics
EXEC DBMS_STATS.GATHER_DICTIONARY_STATS();

-- Delete statistics
EXEC DBMS_STATS.DELETE_TABLE_STATS('HR', 'EMPLOYEES');

-- Lock/Unlock statistics (prevent auto-gather from overwriting)
EXEC DBMS_STATS.LOCK_TABLE_STATS('HR', 'EMPLOYEES');
EXEC DBMS_STATS.UNLOCK_TABLE_STATS('HR', 'EMPLOYEES');
```

### Viewing Statistics
```sql
SELECT num_rows, blocks, avg_row_len, last_analyzed FROM dba_tables WHERE table_name = 'EMPLOYEES';
SELECT column_name, num_distinct, num_nulls, density, last_analyzed FROM dba_tab_columns WHERE table_name = 'EMPLOYEES';
SELECT index_name, num_rows, leaf_blocks, distinct_keys, clustering_factor FROM dba_indexes WHERE table_name = 'EMPLOYEES';
```

## 9.2 Automatic Statistics Gathering

The **Automatic Statistics Gathering** job runs by default:
- Scheduled by the Automatic Maintenance Task framework
- Runs in maintenance windows (weeknights 10PM-2AM, weekends all day)
- Gathers statistics on objects with stale or missing statistics

```sql
-- View automatic statistics job
SELECT client_name, status FROM dba_autotask_client WHERE client_name = 'auto optimizer stats collection';

-- Enable/disable
EXEC DBMS_AUTO_TASK_ADMIN.ENABLE(
  client_name  => 'auto optimizer stats collection',
  operation    => NULL,
  window_name  => NULL
);

EXEC DBMS_AUTO_TASK_ADMIN.DISABLE(
  client_name  => 'auto optimizer stats collection',
  operation    => NULL,
  window_name  => NULL
);
```

## 9.3 AWR (Automatic Workload Repository)

The AWR collects, processes, and maintains performance statistics.

### AWR Snapshots
- Captured automatically every 60 minutes (default)
- Retained for 8 days (default)

```sql
-- View AWR settings
SELECT snap_interval, retention FROM dba_hist_wr_control;

-- Modify AWR settings
EXEC DBMS_WORKLOAD_REPOSITORY.MODIFY_SNAPSHOT_SETTINGS(
  retention => 20160,   -- 14 days in minutes
  interval  => 30       -- 30 minutes
);

-- Create manual snapshot
EXEC DBMS_WORKLOAD_REPOSITORY.CREATE_SNAPSHOT();

-- Drop snapshots
EXEC DBMS_WORKLOAD_REPOSITORY.DROP_SNAPSHOT_RANGE(
  low_snap_id  => 10,
  high_snap_id => 20,
  dbid         => (SELECT dbid FROM v$database)
);

-- Create baseline
EXEC DBMS_WORKLOAD_REPOSITORY.CREATE_BASELINE(
  start_snap_id => 150,
  end_snap_id   => 175,
  baseline_name => 'peak_workload_baseline'
);
```

### AWR Reports
```sql
-- Generate AWR report (text)
@$ORACLE_HOME/rdbms/admin/awrrpt.sql

-- Generate AWR report (HTML)
@$ORACLE_HOME/rdbms/admin/awrrpti.sql
```

### Key AWR Views
```sql
SELECT * FROM dba_hist_snapshot;        -- Snapshot history
SELECT * FROM dba_hist_sys_time_model;  -- Time model stats
SELECT * FROM dba_hist_sysstat;         -- System statistics history
SELECT * FROM dba_hist_sql_summary;     -- SQL workload summary
SELECT * FROM dba_hist_active_sess_history;  -- ASH data (rolled up)
```

## 9.4 ADDM (Automatic Database Diagnostic Monitor)

ADDM analyzes AWR data and identifies performance bottlenecks:
- Runs automatically after each AWR snapshot
- Diagnoses CPU, I/O, memory, SQL issues
- Provides prioritized findings and recommendations
- Accessible via EM or DBMS_ADDM package

```sql
-- View ADDM findings
SELECT finding_name, type, impact_db_pct FROM dba_addm_findings ORDER BY impact_db_pct DESC;

-- Generate ADDM report
SELECT dbms_advisor.get_task_report('ADDM:task_name') FROM DUAL;
```

## 9.5 Active Session History (ASH)

- Samples active session data every 1 second
- Stored in memory (SGA) — circular buffer (v$active_session_history)
- Rolled up to AWR periodically (dba_hist_active_sess_history)
- Used for identifying recent performance issues

```sql
SELECT sql_id, event, wait_class, COUNT(*) AS samples
FROM v$active_session_history
WHERE sample_time > SYSDATE - 1/24  -- Last hour
GROUP BY sql_id, event, wait_class
ORDER BY samples DESC;
```

## 9.6 Alert Thresholds and Notifications

### Setting Metric Thresholds
```sql
-- Set threshold via DBMS_SERVER_ALERT
EXEC DBMS_SERVER_ALERT.SET_THRESHOLD(
  metrics_id      => DBMS_SERVER_ALERT.TABLESPACE_PCT_FULL,
  warning_operator=> DBMS_SERVER_ALERT.OPERATOR_GE,
  warning_value   => '85',
  critical_operator=> DBMS_SERVER_ALERT.OPERATOR_GE,
  critical_value  => '97',
  observation_period => 1,
  consecutive_occurrences => 1,
  instance_name   => NULL,
  object_type     => DBMS_SERVER_ALERT.OBJECT_TYPE_TABLESPACE,
  object_name     => 'USERS'
);
```

### Viewing Alerts
```sql
SELECT reason, message_level, resolution FROM dba_outstanding_alerts;
SELECT object_type, object_name, metrics_name, warning_value, critical_value FROM dba_thresholds;
```

## 9.7 Automatic Maintenance Tasks

Three built-in automatic tasks:
1. **Automatic Statistics Gathering**: Keeps optimizer statistics current
2. **Automatic Segment Advisor**: Identifies segments that could benefit from shrink
3. **Automatic SQL Tuning Advisor**: Identifies high-load SQL and creates SQL profiles

Managed within **Maintenance Windows**:
- `WEEKNIGHT_WINDOW`: Mon-Fri, 10PM-2AM
- `WEEKEND_WINDOW`: Sat 12AM-Mon 12AM

```sql
-- View maintenance windows
SELECT window_name, repeat_interval, duration FROM dba_scheduler_windows;

-- View autotask clients
SELECT client_name, status, last_good_date FROM dba_autotask_client;

-- View autotask job history
SELECT * FROM dba_autotask_client_history;
```

---

# CHAPTER 10: Performance Management {#chapter-10}

## 10.1 Performance Tuning Overview

### Tuning Objectives
- Reduce resource consumption (CPU, I/O, memory)
- Increase throughput
- Reduce response time

### Tuning Order of Priority
1. **Business requirements**: Define acceptable performance targets
2. **Application design**: SQL, schema design, indexing (highest impact)
3. **Instance tuning**: Memory, I/O, CPU configuration
4. **OS tuning**: OS parameters, network

### Oracle Performance Methodology
1. Establish performance baseline
2. Identify performance problem (using AWR, ADDM, ASH)
3. Identify bottleneck (CPU, I/O, memory, contention)
4. Implement fix
5. Measure improvement

## 10.2 Memory Management

### Manual Memory Management
Set each SGA component individually:
```sql
ALTER SYSTEM SET DB_CACHE_SIZE = 800M;
ALTER SYSTEM SET SHARED_POOL_SIZE = 300M;
ALTER SYSTEM SET LARGE_POOL_SIZE = 100M;
```

### Automatic Shared Memory Management (ASMM)
Set `SGA_TARGET`; Oracle auto-tunes SGA components:
```sql
ALTER SYSTEM SET SGA_TARGET = 2G;
-- Oracle distributes memory among buffer cache, shared pool, etc.
-- Manually set values act as minimums
```

### Automatic Memory Management (AMM)
Set `MEMORY_TARGET`; Oracle manages both SGA and PGA:
```sql
ALTER SYSTEM SET MEMORY_TARGET = 4G;
ALTER SYSTEM SET MEMORY_MAX_TARGET = 6G;  -- Maximum AMM can use
-- Set SGA_TARGET = 0 and PGA_AGGREGATE_TARGET = 0 for full AMM
```

### PGA Management
```sql
-- Manual PGA management
ALTER SYSTEM SET WORKAREA_SIZE_POLICY = MANUAL;
ALTER SYSTEM SET SORT_AREA_SIZE = 524288;

-- Automatic PGA management (recommended)
ALTER SYSTEM SET WORKAREA_SIZE_POLICY = AUTO;
ALTER SYSTEM SET PGA_AGGREGATE_TARGET = 1G;
ALTER SYSTEM SET PGA_AGGREGATE_LIMIT = 2G;  -- 12c: hard limit
```

### Memory Advisors
```sql
-- Buffer Cache Advisor
SELECT size_for_estimate, estd_physical_read_factor, estd_physical_reads
FROM v$db_cache_advice ORDER BY size_for_estimate;

-- Shared Pool Advisor
SELECT shared_pool_size_for_estimate, estd_lc_time_saved_factor
FROM v$shared_pool_advice;

-- PGA Advisor
SELECT pga_target_for_estimate, estd_extra_bytes_rw, estd_overalloc_count
FROM v$pga_target_advice;

-- Memory Advisor (AMM)
SELECT memory_size, estd_db_time_factor FROM v$memory_target_advice;
```

## 10.3 I/O Tuning

### Checking I/O Performance
```sql
-- View I/O by data file
SELECT name, phyrds, phywrts, readtim, writetim FROM v$filestat f, v$datafile d
WHERE f.file# = d.file# ORDER BY phyrds DESC;

-- View wait events
SELECT event, total_waits, time_waited, average_wait FROM v$system_event
WHERE wait_class != 'Idle' ORDER BY time_waited DESC;
```

### DBWR and I/O
- Increase `DB_WRITER_PROCESSES` for systems with high I/O
- Use Oracle Automatic Storage Management (ASM) for storage management
- Consider striping data across multiple disks

## 10.4 Contention Issues

### Common Contention Points
- **Library Cache**: High parse activity; check for non-shared SQL (literals vs. bind variables)
- **Redo Log Buffer**: Increase log buffer size; add faster disks
- **Latch Contention**: Check `v$latch`; may indicate tuning needed in another area

### Detecting Contention
```sql
-- Check library cache hit ratio
SELECT gets, gethits, gethitratio FROM v$librarycache WHERE namespace = 'SQL AREA';

-- Check buffer cache hit ratio
SELECT 1 - (physical_reads / (db_block_gets + consistent_gets)) AS hit_ratio
FROM v$buffer_pool_statistics WHERE name = 'DEFAULT';

-- Top wait events
SELECT event, total_waits, time_waited FROM v$system_event
WHERE wait_class != 'Idle' ORDER BY time_waited DESC;
```

---

# CHAPTER 11: SQL Tuning {#chapter-11}

## 11.1 SQL Execution Plan

### Viewing Execution Plans
```sql
-- EXPLAIN PLAN
EXPLAIN PLAN FOR
  SELECT * FROM employees WHERE last_name = 'King';

SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY());

-- With actual statistics (set autotrace)
SET AUTOTRACE ON;
SET AUTOTRACE TRACEONLY;
SET AUTOTRACE TRACEONLY EXPLAIN;

-- DBMS_XPLAN from cursor cache
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR('sql_id'));
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR('sql_id', 0, 'ALLSTATS LAST'));
```

### Reading Execution Plans
- Read bottom-up for first operation
- Indentation shows parent-child relationship
- Key operations:
  - `TABLE ACCESS FULL`: Full table scan
  - `TABLE ACCESS BY INDEX ROWID`: Index lookup
  - `INDEX RANGE SCAN`: Range index scan
  - `INDEX UNIQUE SCAN`: Unique index lookup
  - `HASH JOIN`: Join using hash algorithm
  - `NESTED LOOPS`: Join using nested loops
  - `MERGE JOIN`: Sort-merge join
  - `SORT ORDER BY`: Sort operation
  - `SORT AGGREGATE`: Aggregation

### Plan Statistics
- **Cost**: Relative cost (lower is better — compared within same plan, not across plans)
- **Cardinality**: Estimated rows returned
- **Bytes**: Estimated bytes
- **Time**: Estimated elapsed time

## 11.2 SQL Tuning Advisor (STA)

```sql
-- Create and run tuning task
DECLARE
  l_sql_tune_task_id VARCHAR2(100);
BEGIN
  l_sql_tune_task_id := DBMS_SQLTUNE.CREATE_TUNING_TASK(
    sql_id      => 'abc123xyz',
    scope       => DBMS_SQLTUNE.SCOPE_COMPREHENSIVE,
    time_limit  => 60,
    task_name   => 'tune_slow_query',
    description => 'Tuning task for slow query'
  );
  DBMS_SQLTUNE.EXECUTE_TUNING_TASK(task_name => 'tune_slow_query');
END;
/

-- View recommendations
SELECT DBMS_SQLTUNE.REPORT_TUNING_TASK('tune_slow_query') FROM DUAL;

-- Accept a SQL Profile
EXEC DBMS_SQLTUNE.ACCEPT_SQL_PROFILE(
  task_name    => 'tune_slow_query',
  replace      => TRUE
);

-- View SQL profiles
SELECT name, sql_text, status FROM dba_sql_profiles;

-- Drop tuning task
EXEC DBMS_SQLTUNE.DROP_TUNING_TASK('tune_slow_query');
```

## 11.3 SQL Access Advisor (SAA)

```sql
-- Run SQL Access Advisor on workload
DECLARE
  l_task_id NUMBER;
BEGIN
  DBMS_ADVISOR.CREATE_TASK(DBMS_ADVISOR.SQLACCESS_ADVISOR, l_task_id, 'access_task');
  DBMS_ADVISOR.CREATE_OBJECT(l_task_id, 'WORKLOAD', 'test_workload', NULL, NULL, 'OWNER_NAME = ''HR''');
  DBMS_ADVISOR.SET_TASK_PARAMETER(l_task_id, 'ANALYSIS_SCOPE', 'INDEX,MVIEW');
  DBMS_ADVISOR.EXECUTE_TASK(l_task_id);
  DBMS_OUTPUT.PUT_LINE('Task: ' || l_task_id);
END;
/

-- View recommendations
SELECT rec_id, benefit, annotation FROM dba_advisor_recommendations WHERE task_name = 'access_task';
SELECT * FROM dba_advisor_actions WHERE task_name = 'access_task';

-- Generate script for recommendations
SELECT DBMS_ADVISOR.GET_TASK_SCRIPT('access_task') FROM DUAL;
```

## 11.4 SQL Plan Management (SPM)

SQL Plan Management captures, evolves, and preserves execution plans.

### Plan Baselines
- A SQL plan baseline is a set of accepted plans for a SQL statement
- Only accepted plans are used by the optimizer
- New plans must be evolved/accepted before use

```sql
-- Load plan from cursor cache
DECLARE
  l_cnt NUMBER;
BEGIN
  l_cnt := DBMS_SPM.LOAD_PLANS_FROM_CURSOR_CACHE(sql_id => 'abc123xyz');
END;
/

-- Load from AWR
DECLARE
  l_cnt NUMBER;
BEGIN
  l_cnt := DBMS_SPM.LOAD_PLANS_FROM_AWR(begin_snap => 100, end_snap => 200);
END;
/

-- View baselines
SELECT sql_handle, plan_name, enabled, accepted, fixed FROM dba_sql_plan_baselines;

-- Evolve (test and accept) new plans
EXEC DBMS_SPM.EVOLVE_SQL_PLAN_BASELINE(sql_handle => 'SQL_xxxx');

-- Enable/disable SPM
ALTER SYSTEM SET OPTIMIZER_USE_SQL_PLAN_BASELINES = TRUE;
ALTER SYSTEM SET OPTIMIZER_CAPTURE_SQL_PLAN_BASELINES = TRUE;  -- Automatic capture
```

## 11.5 Adaptive Query Optimization (12c)

New in Oracle 12c:
- **Adaptive Plans**: Optimizer can change join methods mid-execution based on actual row counts
- **Adaptive Statistics**: Automatically gather additional statistics (dynamic sampling, SQL plan directives)
- **SQL Plan Directives**: Automatically created hints stored persistently to improve future plans

```sql
-- View SQL plan directives
SELECT directive_id, type, state, notes FROM dba_sql_plan_directives;

-- Flush directives to disk (from SGA)
EXEC DBMS_SPD.FLUSH_SQL_PLAN_DIRECTIVE();

-- Remove directive
EXEC DBMS_SPD.DROP_SQL_PLAN_DIRECTIVE(directive_id => 12345);
```

---

# CHAPTER 12: Using Database Resource Manager {#chapter-12}

## 12.1 Resource Manager Overview

Oracle Database Resource Manager allows DBAs to:
- Allocate CPU among sessions
- Limit degree of parallelism
- Manage idle sessions and inactive blocking sessions
- Limit undo space per consumer group
- Limit physical I/O per consumer group

### Resource Manager Components
| Component | Description |
|-----------|-------------|
| **Consumer Group** | Named group of sessions with similar resource needs |
| **Resource Plan** | Defines rules for allocating resources across consumer groups |
| **Resource Plan Directive** | Associates a consumer group with a plan and specifies resource limits |
| **Scheduling Policy** | Method for allocating resources (emphasis on CPU) |

## 12.2 Creating Resource Plans

```sql
-- Create a pending area (required before changes)
EXEC DBMS_RESOURCE_MANAGER.CREATE_PENDING_AREA();

-- Create consumer groups
EXEC DBMS_RESOURCE_MANAGER.CREATE_CONSUMER_GROUP(
  consumer_group => 'OLTP_GROUP',
  comment        => 'OLTP users'
);

EXEC DBMS_RESOURCE_MANAGER.CREATE_CONSUMER_GROUP(
  consumer_group => 'BATCH_GROUP',
  comment        => 'Batch processing'
);

-- Create resource plan
EXEC DBMS_RESOURCE_MANAGER.CREATE_PLAN(
  plan    => 'MIXED_WORKLOAD',
  comment => 'OLTP and batch mixed workload plan'
);

-- Create resource plan directives
EXEC DBMS_RESOURCE_MANAGER.CREATE_PLAN_DIRECTIVE(
  plan             => 'MIXED_WORKLOAD',
  group_or_subplan => 'OLTP_GROUP',
  comment          => 'OLTP users get 70% CPU',
  mgmt_p1          => 70
);

EXEC DBMS_RESOURCE_MANAGER.CREATE_PLAN_DIRECTIVE(
  plan             => 'MIXED_WORKLOAD',
  group_or_subplan => 'BATCH_GROUP',
  comment          => 'Batch gets 20% CPU',
  mgmt_p1          => 20
);

EXEC DBMS_RESOURCE_MANAGER.CREATE_PLAN_DIRECTIVE(
  plan             => 'MIXED_WORKLOAD',
  group_or_subplan => 'OTHER_GROUPS',  -- Required catch-all
  comment          => 'Other sessions',
  mgmt_p1          => 10
);

-- Validate and submit pending area
EXEC DBMS_RESOURCE_MANAGER.VALIDATE_PENDING_AREA();
EXEC DBMS_RESOURCE_MANAGER.SUBMIT_PENDING_AREA();
```

### Additional Directive Parameters
| Parameter | Description |
|-----------|-------------|
| `mgmt_p1`..`mgmt_p8` | CPU priority at each level |
| `max_est_exec_time` | Max estimated execution time (seconds) |
| `undo_pool` | Max undo space (KB) |
| `max_idle_time` | Seconds before idle session terminated |
| `max_idle_blocker_time` | Seconds before idle blocker terminated |
| `switch_group` | Group to switch to when threshold exceeded |
| `switch_time` | CPU seconds before switching group |
| `max_utilization_limit` | Hard CPU limit percentage |
| `parallel_degree_limit` | Max parallel degree |

## 12.3 Activating Resource Plans

```sql
-- Activate a plan
ALTER SYSTEM SET RESOURCE_MANAGER_PLAN = 'MIXED_WORKLOAD';

-- Deactivate resource manager
ALTER SYSTEM SET RESOURCE_MANAGER_PLAN = '';

-- View current plan
SELECT name, is_top_plan FROM v$rsrc_plan WHERE is_top_plan = 'TRUE';
```

## 12.4 Consumer Group Mapping

```sql
-- Assign sessions to consumer groups based on attributes
EXEC DBMS_RESOURCE_MANAGER.CREATE_PENDING_AREA();

EXEC DBMS_RESOURCE_MANAGER.SET_CONSUMER_GROUP_MAPPING(
  attribute => DBMS_RESOURCE_MANAGER.SERVICE_NAME,
  value     => 'OLTP',
  consumer_group => 'OLTP_GROUP'
);

EXEC DBMS_RESOURCE_MANAGER.SET_CONSUMER_GROUP_MAPPING(
  attribute => DBMS_RESOURCE_MANAGER.ORACLE_USER,
  value     => 'BATCH_USER',
  consumer_group => 'BATCH_GROUP'
);

EXEC DBMS_RESOURCE_MANAGER.SUBMIT_PENDING_AREA();

-- Manually switch consumer group (for session)
EXEC DBMS_RESOURCE_MANAGER.SWITCH_CONSUMER_GROUP_FOR_SESS(
  session_id     => 20,
  session_serial => 1234,
  consumer_group => 'BATCH_GROUP'
);

-- Grant privilege to switch group
EXEC DBMS_RESOURCE_MANAGER_PRIVS.GRANT_SWITCH_CONSUMER_GROUP(
  grantee_name   => 'SCOTT',
  consumer_group => 'BATCH_GROUP',
  grant_option   => FALSE
);
```

## 12.5 Monitoring Resource Manager
```sql
SELECT group_name, cpu_waits, cpu_wait_time, cpu_consumed_time FROM v$rsrcmgrmetric;
SELECT * FROM v$rsrc_consumer_group;
SELECT * FROM dba_rsrc_plans;
SELECT * FROM dba_rsrc_consumer_groups;
SELECT * FROM dba_rsrc_plan_directives;
```

---

# CHAPTER 13: Automating Tasks with Oracle Scheduler {#chapter-13}

## 13.1 Oracle Scheduler Overview

Oracle Scheduler (DBMS_SCHEDULER) provides enterprise-class job scheduling:
- Schedule jobs using calendar expressions or time intervals
- Chain jobs (job A runs when job B completes)
- Track job execution history
- Send notifications on job completion/failure
- Manage jobs from Enterprise Manager

### Scheduler Components
| Component | Description |
|-----------|-------------|
| **Job** | Unit of work to be executed |
| **Program** | Named definition of what to execute (PL/SQL block, stored procedure, executable) |
| **Schedule** | Named definition of when to run |
| **Job Class** | Groups jobs with similar logging/priority |
| **Window** | Time period for maintenance tasks |
| **Chain** | Sequence of programs/jobs to execute |

## 13.2 Creating Scheduler Jobs

### Simple Job
```sql
-- Create a simple job
BEGIN
  DBMS_SCHEDULER.CREATE_JOB(
    job_name        => 'NIGHTLY_STATS',
    job_type        => 'PLSQL_BLOCK',
    job_action      => 'BEGIN DBMS_STATS.GATHER_SCHEMA_STATS(''HR''); END;',
    start_date      => SYSTIMESTAMP,
    repeat_interval => 'FREQ=DAILY;BYHOUR=2;BYMINUTE=0',
    end_date        => NULL,
    enabled         => TRUE,
    comments        => 'Nightly statistics gathering for HR schema'
  );
END;
/
```

### Job Types
| Job Type | Description |
|----------|-------------|
| `PLSQL_BLOCK` | Anonymous PL/SQL block |
| `STORED_PROCEDURE` | Named stored procedure |
| `EXECUTABLE` | OS executable/script |
| `CHAIN` | Linked set of job steps |
| `SQL_SCRIPT` | SQL*Plus script |

### Using Programs and Schedules
```sql
-- Create program
BEGIN
  DBMS_SCHEDULER.CREATE_PROGRAM(
    program_name        => 'GATHER_STATS_PROG',
    program_type        => 'STORED_PROCEDURE',
    program_action      => 'DBMS_STATS.GATHER_SCHEMA_STATS',
    number_of_arguments => 1,
    enabled             => TRUE,
    comments            => 'Statistics gathering program'
  );
END;
/

-- Create schedule
BEGIN
  DBMS_SCHEDULER.CREATE_SCHEDULE(
    schedule_name   => 'WEEKNIGHT_SCHED',
    repeat_interval => 'FREQ=WEEKLY;BYDAY=MON,TUE,WED,THU,FRI;BYHOUR=22',
    start_date      => SYSTIMESTAMP,
    comments        => 'Weeknight schedule at 10 PM'
  );
END;
/

-- Create job using program and schedule
BEGIN
  DBMS_SCHEDULER.CREATE_JOB(
    job_name      => 'STATS_JOB',
    program_name  => 'GATHER_STATS_PROG',
    schedule_name => 'WEEKNIGHT_SCHED',
    enabled       => TRUE
  );
END;
/
```

## 13.3 Calendar Expression Syntax
```
FREQ=YEARLY|MONTHLY|WEEKLY|DAILY|HOURLY|MINUTELY|SECONDLY
INTERVAL=n (e.g., INTERVAL=2 for every 2 periods)
BYSECOND=0-59
BYMINUTE=0-59
BYHOUR=0-23
BYDAY=MON,TUE,WED,THU,FRI,SAT,SUN
BYMONTHDAY=1-31 (negative counts from end)
BYMONTH=1-12 (or JAN,FEB,...)
BYWEEKNO=1-53
BYYEARDAY=1-366

-- Examples:
'FREQ=DAILY;BYHOUR=6;BYMINUTE=0;BYSECOND=0'        -- Daily at 6 AM
'FREQ=WEEKLY;BYDAY=MON;BYHOUR=8'                    -- Weekly on Monday at 8 AM
'FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=0'                -- 1st of each month at midnight
'FREQ=YEARLY;BYMONTH=JAN;BYMONTHDAY=1;BYHOUR=0'    -- January 1st at midnight
'FREQ=MINUTELY;INTERVAL=15'                          -- Every 15 minutes
```

## 13.4 Managing Jobs
```sql
-- Enable/Disable job
EXEC DBMS_SCHEDULER.ENABLE('NIGHTLY_STATS');
EXEC DBMS_SCHEDULER.DISABLE('NIGHTLY_STATS');

-- Run job immediately
EXEC DBMS_SCHEDULER.RUN_JOB('NIGHTLY_STATS');

-- Stop a running job
EXEC DBMS_SCHEDULER.STOP_JOB('NIGHTLY_STATS');

-- Drop job
EXEC DBMS_SCHEDULER.DROP_JOB('NIGHTLY_STATS');
EXEC DBMS_SCHEDULER.DROP_JOB('NIGHTLY_STATS', FORCE => TRUE);  -- Even if running

-- View jobs
SELECT job_name, status, enabled, next_run_date FROM dba_scheduler_jobs;

-- View job run history
SELECT job_name, status, actual_start_date, run_duration, error#
FROM dba_scheduler_job_run_details
WHERE job_name = 'NIGHTLY_STATS'
ORDER BY actual_start_date DESC;

-- View job log
SELECT job_name, status, log_date FROM dba_scheduler_job_log;
```

## 13.5 Job Chains

```sql
-- Create chain
EXEC DBMS_SCHEDULER.CREATE_CHAIN('BACKUP_CHAIN');

-- Define steps
EXEC DBMS_SCHEDULER.DEFINE_CHAIN_STEP(
  chain_name  => 'BACKUP_CHAIN',
  step_name   => 'STEP1',
  program_name => 'FULL_BACKUP_PROG'
);

EXEC DBMS_SCHEDULER.DEFINE_CHAIN_STEP(
  chain_name   => 'BACKUP_CHAIN',
  step_name    => 'STEP2',
  program_name => 'VERIFY_BACKUP_PROG'
);

-- Define rules (step sequencing)
EXEC DBMS_SCHEDULER.DEFINE_CHAIN_RULE(
  chain_name  => 'BACKUP_CHAIN',
  condition   => 'TRUE',
  action      => 'START STEP1',
  rule_name   => 'RULE1'
);

EXEC DBMS_SCHEDULER.DEFINE_CHAIN_RULE(
  chain_name  => 'BACKUP_CHAIN',
  condition   => 'STEP1 SUCCEEDED',
  action      => 'START STEP2',
  rule_name   => 'RULE2'
);

EXEC DBMS_SCHEDULER.DEFINE_CHAIN_RULE(
  chain_name  => 'BACKUP_CHAIN',
  condition   => 'STEP2 COMPLETED',
  action      => 'END',
  rule_name   => 'RULE3'
);

-- Enable chain
EXEC DBMS_SCHEDULER.ENABLE('BACKUP_CHAIN');
```

---

# CHAPTER 14: Managing Space {#chapter-14}

## 14.1 Space Management Overview

Space management involves:
- Monitoring tablespace and data file space usage
- Managing segment space (growing segments, shrinking segments)
- Managing free space and fragmentation

## 14.2 Monitoring Space Usage

```sql
-- Tablespace usage
SELECT t.tablespace_name,
       t.bytes AS total_bytes,
       f.bytes AS free_bytes,
       t.bytes - f.bytes AS used_bytes,
       ROUND((1 - f.bytes/t.bytes)*100, 2) AS pct_used
FROM (SELECT tablespace_name, SUM(bytes) bytes FROM dba_data_files GROUP BY tablespace_name) t,
     (SELECT tablespace_name, SUM(bytes) bytes FROM dba_free_space GROUP BY tablespace_name) f
WHERE t.tablespace_name = f.tablespace_name(+);

-- Segment sizes
SELECT owner, segment_name, segment_type, bytes, extents, blocks
FROM dba_segments
ORDER BY bytes DESC;

-- Find space that can be reclaimed
SELECT * FROM dba_segments WHERE (blocks - high_water_mark_blocks) > 1000;
```

## 14.3 Proactive Space Management

### Space Usage Alerts
Oracle automatically alerts when tablespace usage exceeds thresholds:
- Warning: 85% full (default)
- Critical: 97% full (default)

These are managed via the `DBA_THRESHOLDS` view and DBMS_SERVER_ALERT.

### Automatic Extend
Always configure critical tablespaces with AUTOEXTEND to prevent ORA-01653 errors:
```sql
ALTER DATABASE DATAFILE '/path/to/file.dbf' AUTOEXTEND ON NEXT 50M MAXSIZE 2G;
```

## 14.4 Segment Shrink

Reclaims unused space within a segment and compacts it:
```sql
-- Enable row movement (required for shrink)
ALTER TABLE hr.employees ENABLE ROW MOVEMENT;

-- Shrink: compact + deallocate space
ALTER TABLE hr.employees SHRINK SPACE;

-- Shrink: compact only (maintain HWM for online operations)
ALTER TABLE hr.employees SHRINK SPACE COMPACT;

-- Shrink index
ALTER INDEX hr.emp_last_name_idx SHRINK SPACE;

-- Cascade shrink (table + all dependent objects)
ALTER TABLE hr.employees SHRINK SPACE CASCADE;
```

Note: Shrink is an online operation. COMPACT phase does not move HWM (other sessions can still insert). Second phase adjusts HWM.

## 14.5 Segment Advisor

Identifies segments that would benefit from shrink:
```sql
-- Run Segment Advisor
DECLARE
  l_task_id   NUMBER;
  l_task_name VARCHAR2(100) := 'SEG_ADVISOR_TASK';
BEGIN
  DBMS_ADVISOR.CREATE_TASK(DBMS_ADVISOR.SQLACCESS_ADVISOR, l_task_id, l_task_name);
  DBMS_ADVISOR.CREATE_OBJECT(
    l_task_id, 'TABLE', 'HR', 'EMPLOYEES', NULL, NULL, NULL
  );
  DBMS_ADVISOR.EXECUTE_TASK(l_task_id);
END;
/

-- View recommendations
SELECT * FROM dba_advisor_recommendations WHERE task_name = 'SEG_ADVISOR_TASK';
```

## 14.6 Recycle Bin

When a table is dropped without PURGE, it goes to the recycle bin:
```sql
-- View recycle bin
SELECT object_name, original_name, type, droptime FROM recyclebin;
SELECT object_name, original_name, type, droptime FROM dba_recyclebin;

-- Restore from recycle bin
FLASHBACK TABLE employees TO BEFORE DROP;
FLASHBACK TABLE "BIN$..." TO BEFORE DROP;  -- Specific recycle bin name
FLASHBACK TABLE employees TO BEFORE DROP RENAME TO employees_restored;

-- Purge recycle bin
PURGE TABLE employees;           -- Specific dropped table
PURGE INDEX emp_last_name_idx;  -- Specific dropped index
PURGE RECYCLEBIN;                -- Own recycle bin
PURGE DBA_RECYCLEBIN;           -- All users' recycle bins

-- Drop without sending to recycle bin
DROP TABLE employees PURGE;
```

## 14.7 Temporary Tablespace Management

```sql
-- View temporary usage
SELECT username, tablespace, segtype, blocks FROM v$tempseg_usage;
SELECT * FROM v$sort_usage;
SELECT * FROM v$temp_extent_pool;

-- Shrink temporary tablespace (12c)
ALTER TABLESPACE temp SHRINK SPACE;
ALTER TABLESPACE temp SHRINK SPACE KEEP 100M;  -- Keep minimum 100M

-- Temporary tablespace groups
CREATE TEMPORARY TABLESPACE temp2 TEMPFILE '/u01/temp201.dbf' SIZE 100M;
ALTER TABLESPACE temp ADD TEMPFILE '/u01/temp102.dbf' SIZE 100M;

-- Create temp tablespace group
ALTER TABLESPACE temp TABLESPACE GROUP temp_grp;
ALTER TABLESPACE temp2 TABLESPACE GROUP temp_grp;
ALTER USER scott TEMPORARY TABLESPACE temp_grp;  -- Assign group to user
```

---

# CHAPTER 15: Oracle Database Backup and Recovery Concepts {#chapter-15}

## 15.1 Backup and Recovery Terminology

| Term | Definition |
|------|-----------|
| **Backup** | Copy of database files for use in case of failure |
| **Recovery** | Restoring database to consistent state after failure |
| **Restore** | Copying backup files back to disk |
| **MTTR** | Mean Time To Recover |
| **RPO** | Recovery Point Objective: Maximum acceptable data loss |
| **RTO** | Recovery Time Objective: Maximum acceptable downtime |

## 15.2 Types of Failures

### Failure Categories
1. **Statement Failure**: SQL statement fails (not enough space, constraint violation)
   - Recovery: Oracle rolls back the statement automatically
2. **User Process Failure**: User process terminates abnormally
   - Recovery: PMON cleans up resources automatically
3. **User Error**: User drops table, corrupts data, etc.
   - Recovery: Flashback technology, import from export/Data Pump
4. **Instance Failure**: Database instance crashes (power loss, hardware failure)
   - Recovery: Automatic instance recovery at next startup
5. **Media Failure**: Data file, control file, redo log file lost or corrupted
   - Recovery: Restore from backup + apply redo logs

## 15.3 Instance Recovery (Automatic)

When instance fails and database is restarted:
1. **Roll forward**: SMON applies all redo from redo logs (may include uncommitted changes)
2. **Database opens**: Available to users
3. **Roll back**: Uncommitted transactions are rolled back using undo data

MTTR Advisor controls target recovery time:
```sql
ALTER SYSTEM SET FAST_START_MTTR_TARGET = 60;  -- Target 60 seconds recovery time
SELECT recovery_estimated_ios, actual_redo_blks, target_mttr FROM v$instance_recovery;
```

## 15.4 Backup Types

### Physical Backups
- **Whole Database Backup**: All data files + control file + SPFILE
- **Partial Backup**: Specific tablespaces or data files
- **Consistent (Cold) Backup**: Database shut down cleanly first
- **Inconsistent (Hot/Online) Backup**: Database is open (requires ARCHIVELOG mode)

### Backup Methods
| Method | Tool | Notes |
|--------|------|-------|
| RMAN | RMAN | Oracle's recommended tool; supports incremental, compression, encryption |
| User-Managed | OS + SQL | Manual process; tablespace put in backup mode |
| Export/Data Pump | expdp/exp | Logical backup only |

### Incremental Backups
- **Level 0**: Full backup (baseline for incremental strategy)
- **Level 1 Cumulative**: All blocks changed since last level 0
- **Level 1 Differential**: All blocks changed since last level 0 or level 1

### Block Change Tracking
```sql
-- Enable block change tracking (dramatically speeds up incremental backups)
ALTER DATABASE ENABLE BLOCK CHANGE TRACKING USING FILE '/u01/bct/orcl.bct';
ALTER DATABASE DISABLE BLOCK CHANGE TRACKING;
SELECT filename, status, bytes FROM v$block_change_tracking;
```

## 15.5 Oracle Recovery Manager (RMAN)

RMAN is Oracle's recommended backup and recovery tool:
- Backup compression and encryption
- Block-level incremental backups
- Automatic backup catalog management
- Cross-platform transport of tablespaces
- Integration with Media Management Library (MML)

### RMAN Architecture
- **RMAN Executable**: Client process
- **Target Database**: Database being backed up
- **Recovery Catalog**: Optional repository database (recommended for production)
- **Media Management Library**: Interface to tape

### Connecting to RMAN
```bash
rman TARGET /                          # OS auth, no catalog
rman TARGET sys/password               # Password auth, no catalog
rman TARGET / CATALOG rman/password@catdb  # With recovery catalog
rman TARGET / NOCATALOG               # Explicitly no catalog
```

### RMAN Configuration
```sql
RMAN> SHOW ALL;                         -- View current configuration
RMAN> CONFIGURE RETENTION POLICY TO REDUNDANCY 2;       -- Keep 2 copies
RMAN> CONFIGURE RETENTION POLICY TO RECOVERY WINDOW OF 7 DAYS;
RMAN> CONFIGURE BACKUP OPTIMIZATION ON;                  -- Skip unchanged files
RMAN> CONFIGURE COMPRESSION ALGORITHM 'MEDIUM';
RMAN> CONFIGURE CHANNEL DEVICE TYPE DISK FORMAT '/u01/backup/%U';
RMAN> CONFIGURE CONTROLFILE AUTOBACKUP ON;               -- Always backup control file
RMAN> CONFIGURE CONTROLFILE AUTOBACKUP FORMAT FOR DEVICE TYPE DISK TO '/u01/backup/cf_%F';
```

---

# CHAPTER 16: Performing Database Backups {#chapter-16}

## 16.1 RMAN Backup Commands

### Whole Database Backups
```sql
-- Full backup
RMAN> BACKUP DATABASE;
RMAN> BACKUP DATABASE PLUS ARCHIVELOG;      -- Include archived logs
RMAN> BACKUP DATABASE FORMAT '/u01/backup/%U.bkp';
RMAN> BACKUP DATABASE COMPRESSED;           -- Compressed backup
RMAN> BACKUP DATABASE COMPRESSED PLUS ARCHIVELOG DELETE INPUT;  -- Delete archived logs after backup

-- Backup specific tablespace
RMAN> BACKUP TABLESPACE users, hr_data;

-- Backup specific data file
RMAN> BACKUP DATAFILE 4, 5;

-- Backup control file
RMAN> BACKUP CURRENT CONTROLFILE;

-- Backup SPFILE
RMAN> BACKUP SPFILE;
```

### Incremental Backups
```sql
-- Level 0 (baseline)
RMAN> BACKUP INCREMENTAL LEVEL 0 DATABASE;

-- Level 1 differential (since last level 0 or level 1)
RMAN> BACKUP INCREMENTAL LEVEL 1 DATABASE;

-- Level 1 cumulative (since last level 0)
RMAN> BACKUP INCREMENTAL LEVEL 1 CUMULATIVE DATABASE;

-- Recommended incremental strategy:
-- Sunday: Level 0 (full baseline)
-- Mon-Sat: Level 1 differential or cumulative
```

### Archivelog Backups
```sql
RMAN> BACKUP ARCHIVELOG ALL;
RMAN> BACKUP ARCHIVELOG ALL DELETE INPUT;         -- Backup then delete
RMAN> BACKUP ARCHIVELOG FROM SEQUENCE 100;
RMAN> BACKUP ARCHIVELOG FROM TIME 'SYSDATE-7';
RMAN> BACKUP ARCHIVELOG FROM SCN 1234567;
```

### Scripted RMAN Backups
```sql
-- Run script
RMAN> @/home/oracle/scripts/backup.rman

-- Create stored script
RMAN> CREATE SCRIPT full_backup {
  BACKUP DATABASE PLUS ARCHIVELOG;
  DELETE OBSOLETE;
}
RMAN> RUN { EXECUTE SCRIPT full_backup; }
```

## 16.2 Backup Tags and Copies
```sql
-- Assign tag to backup
RMAN> BACKUP DATABASE TAG 'WEEKLY_FULL';

-- Create image copy (exact copy, not backup set)
RMAN> BACKUP AS COPY DATABASE;
RMAN> COPY DATAFILE 4 TO '/u01/backup/df4.dbf';

-- List backups
RMAN> LIST BACKUP SUMMARY;
RMAN> LIST BACKUP OF DATABASE;
RMAN> LIST BACKUP OF TABLESPACE users;
RMAN> LIST COPY OF DATABASE;
```

## 16.3 Backup Maintenance
```sql
-- Check backup validity
RMAN> VALIDATE DATABASE;
RMAN> VALIDATE BACKUPSET n;

-- Cross-check backup (verify backup files exist on disk/tape)
RMAN> CROSSCHECK BACKUP;
RMAN> CROSSCHECK ARCHIVELOG ALL;

-- Mark backup as unavailable
RMAN> CHANGE BACKUP ... UNAVAILABLE;
RMAN> CHANGE BACKUP ... AVAILABLE;

-- Delete obsolete backups (per retention policy)
RMAN> DELETE OBSOLETE;

-- Delete expired backups (files no longer exist)
RMAN> DELETE EXPIRED BACKUP;
RMAN> DELETE EXPIRED ARCHIVELOG ALL;
```

## 16.4 Fast Recovery Area (FRA)

The Fast Recovery Area (formerly Flash Recovery Area) is a disk location for recovery-related files:
- RMAN backups
- Archived log files
- Control file autobackups
- Flashback logs
- Online redo log copies

```sql
-- Configure FRA
ALTER SYSTEM SET DB_RECOVERY_FILE_DEST = '/u01/fra';
ALTER SYSTEM SET DB_RECOVERY_FILE_DEST_SIZE = 50G;

-- View FRA usage
SELECT * FROM v$recovery_file_dest;
SELECT file_type, percent_space_used, percent_space_reclaimable, number_of_files FROM v$flash_recovery_area_usage;
```

---

# CHAPTER 17: Performing Database Recovery {#chapter-17}

## 17.1 Recovery Concepts

### Types of Recovery
| Recovery Type | Description | Required Mode |
|---------------|-------------|---------------|
| **Complete Recovery** | Recover to the present (no data loss) | ARCHIVELOG |
| **Incomplete Recovery** (PITR) | Recover to a point in time before failure | ARCHIVELOG |
| **Instance Recovery** | Automatic after crash | Any |
| **Crash Recovery** | Same as instance recovery for single instance | Any |
| **Block Media Recovery** | Recover individual data blocks | ARCHIVELOG |

### Recovery Steps (General)
1. Restore backup files (RMAN RESTORE)
2. Apply archived redo logs (RMAN RECOVER)
3. Open database

## 17.2 Complete Recovery with RMAN

```sql
-- Restore and recover entire database
RMAN> STARTUP MOUNT;
RMAN> RESTORE DATABASE;
RMAN> RECOVER DATABASE;
RMAN> ALTER DATABASE OPEN;

-- Restore and recover specific tablespace
RMAN> SQL 'ALTER TABLESPACE users OFFLINE IMMEDIATE';
RMAN> RESTORE TABLESPACE users;
RMAN> RECOVER TABLESPACE users;
RMAN> SQL 'ALTER TABLESPACE users ONLINE';

-- Restore and recover specific data file
RMAN> SQL 'ALTER DATABASE DATAFILE 4 OFFLINE';
RMAN> RESTORE DATAFILE 4;
RMAN> RECOVER DATAFILE 4;
RMAN> SQL 'ALTER DATABASE DATAFILE 4 ONLINE';
```

## 17.3 Incomplete Recovery (Point-In-Time Recovery)

```sql
-- Recover to specific time
RMAN> RUN {
  SET UNTIL TIME "TO_DATE('2024-01-15 14:30:00','YYYY-MM-DD HH24:MI:SS')";
  RESTORE DATABASE;
  RECOVER DATABASE;
  ALTER DATABASE OPEN RESETLOGS;
}

-- Recover to specific SCN
RMAN> RUN {
  SET UNTIL SCN 1234567;
  RESTORE DATABASE;
  RECOVER DATABASE;
  ALTER DATABASE OPEN RESETLOGS;
}

-- Recover to specific log sequence
RMAN> RUN {
  SET UNTIL SEQUENCE 150 THREAD 1;
  RESTORE DATABASE;
  RECOVER DATABASE;
  ALTER DATABASE OPEN RESETLOGS;
}
```

Note: After incomplete recovery, database must be opened with `RESETLOGS`. This resets log sequence numbers.

## 17.4 Block Media Recovery

Recovers individual corrupted blocks without taking data file offline:
```sql
RMAN> RECOVER DATAFILE 4 BLOCK 100;
RMAN> RECOVER DATAFILE 4 BLOCK 100 TO 200;  -- Range of blocks
RMAN> RECOVER CORRUPTION LIST;              -- Recover all blocks in V$DATABASE_BLOCK_CORRUPTION
```

## 17.5 Flashback Technology

Oracle Flashback provides various capabilities to undo human errors:

### Flashback Query
```sql
-- Query data as of specific time
SELECT * FROM employees AS OF TIMESTAMP (SYSTIMESTAMP - INTERVAL '1' HOUR);
SELECT * FROM employees AS OF TIMESTAMP TO_TIMESTAMP('2024-01-15 10:00:00', 'YYYY-MM-DD HH24:MI:SS');

-- Query as of specific SCN
SELECT * FROM employees AS OF SCN 12345678;

-- Flashback Versions Query (see all versions of a row)
SELECT versions_starttime, versions_endtime, versions_operation, salary
FROM employees VERSIONS BETWEEN TIMESTAMP SYSTIMESTAMP - INTERVAL '1' HOUR AND SYSTIMESTAMP
WHERE employee_id = 100;
```

### Flashback Table
```sql
-- Enable row movement (required)
ALTER TABLE employees ENABLE ROW MOVEMENT;

-- Flash back table to timestamp
FLASHBACK TABLE employees TO TIMESTAMP (SYSTIMESTAMP - INTERVAL '1' HOUR);

-- Flash back table to SCN
FLASHBACK TABLE employees TO SCN 12345678;

-- Flash back table to before DROP
FLASHBACK TABLE employees TO BEFORE DROP;
```

### Flashback Drop (Recycle Bin)
See Section 14.6.

### Flashback Database
Rewinds the entire database to a past state without restore:
```sql
-- Enable Flashback Database
ALTER SYSTEM SET DB_FLASHBACK_RETENTION_TARGET = 2880;  -- 2 days in minutes
ALTER DATABASE FLASHBACK ON;

-- Perform Flashback Database
SHUTDOWN IMMEDIATE;
STARTUP MOUNT;
FLASHBACK DATABASE TO TIMESTAMP (SYSDATE - 1/24);  -- 1 hour ago
FLASHBACK DATABASE TO SCN 12345678;
ALTER DATABASE OPEN RESETLOGS;

-- View flashback log info
SELECT oldest_flashback_scn, oldest_flashback_time, flashback_size FROM v$flashback_database_log;
```

### Flashback Data Archive (FDA / Total Recall)
Long-term tracking of all row changes (12c: called "Oracle Total Recall"):
```sql
-- Create flashback data archive
CREATE FLASHBACK ARCHIVE fda_1year TABLESPACE flashback_tbs RETENTION 1 YEAR;

-- Enable FDA on table
ALTER TABLE employees FLASHBACK ARCHIVE fda_1year;

-- Query historical data
SELECT * FROM employees AS OF TIMESTAMP (SYSTIMESTAMP - INTERVAL '6' MONTH);

-- Disable FDA on table
ALTER TABLE employees NO FLASHBACK ARCHIVE;
```

## 17.6 Data Recovery Advisor (DRA)

Automatically diagnoses and repairs database failures:
```sql
-- In RMAN:
RMAN> LIST FAILURE;          -- List all known failures
RMAN> ADVISE FAILURE;        -- Get repair advice
RMAN> REPAIR FAILURE;        -- Execute repair (prompts for confirmation)
RMAN> REPAIR FAILURE NOPROMPT;  -- Execute without prompt

-- In SQL (via Health Monitor):
SELECT name, status, description FROM v$ir_failure;
SELECT advice_id, strategy, repair_script FROM v$ir_manual_checklist;
```

---

# CHAPTER 18: Moving Data {#chapter-18}

## 18.1 Oracle Data Pump

Data Pump is Oracle's high-speed data movement utility (replacement for exp/imp).

### Key Features
- Parallel processing
- Restart capability
- Fine-grained object selection
- Remap schemas, tablespaces, data
- Network mode (direct database-to-database)
- Compression and encryption

### Directory Object (Required)
```sql
-- Create directory object
CREATE DIRECTORY dpump_dir AS '/u01/datapump';
GRANT READ, WRITE ON DIRECTORY dpump_dir TO hr;

-- View directories
SELECT directory_name, directory_path FROM dba_directories;
```

### Data Pump Export (expdp)
```bash
# Full database export
expdp system/password FULL=Y DIRECTORY=dpump_dir DUMPFILE=full_%U.dmp LOGFILE=full_exp.log PARALLEL=4

# Schema export
expdp system/password SCHEMAS=HR,OE DIRECTORY=dpump_dir DUMPFILE=hr_oe_%U.dmp LOGFILE=hr_oe_exp.log

# Table export
expdp hr/password TABLES=employees,departments DIRECTORY=dpump_dir DUMPFILE=emp_dept.dmp

# Tablespace export
expdp system/password TABLESPACES=users DIRECTORY=dpump_dir DUMPFILE=users_tbs.dmp

# Query filter
expdp hr/password TABLES=employees QUERY=employees:'"WHERE department_id=50"' DIRECTORY=dpump_dir DUMPFILE=emp50.dmp

# Estimate space
expdp hr/password SCHEMAS=HR ESTIMATE_ONLY=Y

# Compress data
expdp hr/password SCHEMAS=HR COMPRESSION=ALL DIRECTORY=dpump_dir DUMPFILE=hr_comp.dmp
```

### Data Pump Import (impdp)
```bash
# Full database import
impdp system/password FULL=Y DIRECTORY=dpump_dir DUMPFILE=full_%U.dmp LOGFILE=full_imp.log PARALLEL=4

# Schema import with remap
impdp system/password SCHEMAS=HR DIRECTORY=dpump_dir DUMPFILE=hr.dmp REMAP_SCHEMA=HR:HR2 REMAP_TABLESPACE=USERS:USERS2

# Table import
impdp hr/password TABLES=employees DIRECTORY=dpump_dir DUMPFILE=emp.dmp

# Table import with remap
impdp system/password TABLES=hr.employees REMAP_TABLE=hr.employees:hr.employees_restore DIRECTORY=dpump_dir DUMPFILE=emp.dmp

# Network import (no dump file)
impdp system/password NETWORK_LINK=source_db SCHEMAS=HR DIRECTORY=dpump_dir LOGFILE=net_imp.log

# Exclude objects
impdp system/password FULL=Y EXCLUDE=STATISTICS DIRECTORY=dpump_dir DUMPFILE=full.dmp

# Include only specific objects
impdp system/password SCHEMAS=HR INCLUDE=TABLE:"IN ('EMPLOYEES','DEPARTMENTS')" DIRECTORY=dpump_dir DUMPFILE=hr.dmp
```

### Interactive Mode Commands
```bash
# Attach to running job
expdp hr/password ATTACH=job_name
impdp system/password ATTACH=sys_import_full_01

Import> STATUS
Import> ADD_FILE=file2.dmp
Import> PARALLEL=8
Import> STOP_JOB
Import> KILL_JOB
Import> CONTINUE_CLIENT
```

## 18.2 SQL*Loader

Bulk load external data into Oracle tables:

### Control File Structure
```
LOAD DATA
INFILE '/home/oracle/data/employees.csv'
[APPEND | INSERT | REPLACE | TRUNCATE]
INTO TABLE employees
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
TRAILING NULLCOLS
(
  employee_id,
  first_name,
  last_name,
  email,
  hire_date    DATE "YYYY-MM-DD",
  job_id,
  salary       DECIMAL EXTERNAL
)
```

### SQL*Loader Execution
```bash
sqlldr userid=hr/password CONTROL=emp.ctl LOG=emp.log BAD=emp.bad
sqlldr userid=hr/password CONTROL=emp.ctl DIRECT=TRUE    # Direct path (faster)
sqlldr userid=hr/password CONTROL=emp.ctl PARALLEL=TRUE  # Parallel load
```

### SQL*Loader Options
| Option | Description |
|--------|-------------|
| `DIRECT` | Direct path load (bypass buffer cache) |
| `PARALLEL` | Parallel direct path load |
| `SKIP` | Skip first N rows |
| `LOAD` | Maximum rows to load |
| `ERRORS` | Maximum errors before abort |
| `ROWS` | Rows per commit (conventional path) |
| `READSIZE` | Buffer size |

### External Tables (Alternative to SQL*Loader)
```sql
CREATE TABLE emp_ext (
  employee_id NUMBER,
  first_name  VARCHAR2(20),
  last_name   VARCHAR2(25)
)
ORGANIZATION EXTERNAL (
  TYPE ORACLE_LOADER
  DEFAULT DIRECTORY ext_dir
  ACCESS PARAMETERS (
    RECORDS DELIMITED BY NEWLINE
    FIELDS TERMINATED BY ','
  )
  LOCATION ('employees.csv')
)
REJECT LIMIT UNLIMITED;

-- Load from external table into regular table
INSERT INTO employees SELECT * FROM emp_ext;
```

## 18.3 Transportable Tablespaces

Move entire tablespaces between databases with minimal downtime:
```sql
-- On source database:
-- 1. Make tablespace read-only
ALTER TABLESPACE users READ ONLY;

-- 2. Export metadata
expdp system/password TRANSPORT_TABLESPACES=users DIRECTORY=dpump_dir DUMPFILE=users_ts.dmp

-- 3. Copy data files to destination (OS level)

-- On destination database:
-- 4. Import metadata
impdp system/password TRANSPORT_DATAFILES='/u01/oradata/orcl/users01.dbf' DIRECTORY=dpump_dir DUMPFILE=users_ts.dmp

-- 5. Make tablespace read-write
ALTER TABLESPACE users READ WRITE;

-- On source:
-- 6. Make tablespace read-write again
ALTER TABLESPACE users READ WRITE;
```

## 18.4 Transportable Database (Full Database Transport)

Introduced in 12c, allows cross-platform database migration:
```bash
# Use RMAN to convert files if crossing platforms with different endianness
RMAN> CONVERT DATABASE NEW DATABASE 'target'
      TRANSPORT SCRIPT '/tmp/transport.sql'
      TO PLATFORM 'Microsoft Windows x86 64-bit'
      DB_FILE_NAME_CONVERT '/u01/oradata/orcl/','/u01/oradata/target/';
```

---

# APPENDIX A: Working with Oracle Support {#appendix-a}

## A.1 My Oracle Support (MOS)

My Oracle Support (support.oracle.com) provides:
- Knowledge base articles (MOS notes, HOW-TO documents)
- Patch downloads
- Community forums
- Service request management
- Software downloads

### My Oracle Support Note Types
| Type | Description |
|------|-------------|
| Troubleshooting | Step-by-step problem resolution |
| HOW-TO | Task procedures |
| Reference | Technical reference information |
| Alert | Security or critical patch alerts |
| Bulletin | Important announcements |

## A.2 Oracle Support Service Request Process

1. Search MOS for existing solutions
2. Log a Service Request (SR) online or by phone
3. Provide:
   - Oracle product and version
   - OS and version
   - Error messages (exact text including ORA- numbers)
   - Diagnostic data (trace files, alert log excerpts)
   - Steps to reproduce
4. Track SR and communicate via MOS

## A.3 Support Workbench

The Support Workbench (accessible via Enterprise Manager) streamlines Oracle Support interaction:

### Support Workbench Workflow
1. View critical error alerts in Enterprise Manager Database Home page
2. Examine problem details and incident list
3. Optionally run additional health checks (SQL Test Case Builder)
4. Create service request with My Oracle Support
5. Package and upload diagnostic data via Incident Packaging Service
6. Track service request and implement repairs
7. Close incidents when resolved

### Accessing Support Workbench
- Via EM Cloud Control: Oracle Database menu > Diagnostics > Support Workbench
- Via ADRCI command-line utility

### Problems vs. Incidents
- **Problem**: A type of error (e.g., ORA-4036). Has a unique problem key.
- **Incident**: A single occurrence of a problem. Each incident has its own dump files.

### Viewing Problems and Incidents
```sql
-- Via EM Support Workbench UI or ADRCI:
adrci> show problem
adrci> show incident
adrci> show incident -mode detail -p "incident_id=12345"
```

### Packaging Diagnostic Data
**Quick Packaging** (automated):
1. Select problem
2. Provide package name and description
3. Optionally send to Oracle Support immediately
4. System auto-packages all diagnostic data and uploads

**Advanced Packaging** (manual control):
1. Choose incidents to include
2. Add/remove files manually
3. Add SQL test cases
4. Redact sensitive data before uploading

## A.4 Patches and Patch Types

### Oracle Patch Types
| Patch Type | Description |
|------------|-------------|
| **Interim Patch** (One-off) | Fix for specific bug |
| **Critical Patch Update (CPU/PSU)** | Quarterly security fixes |
| **Patch Set Update (PSU)** | Quarterly bug fixes + security |
| **Bundle Patch** | Combination patch for specific platform |
| **Release Update (RU)** | 12.2+: replaces PSU (quarterly) |
| **Release Update Revision (RUR)** | Subset of RU with critical fixes |

### OPatch Utility

OPatch is Oracle's patch management tool:
```bash
# Check OPatch version
opatch version

# List installed patches
opatch lsinventory
opatch lsinventory -detail

# Apply a patch (shut down database first for most patches)
cd /patch/directory
opatch apply

# Rollback a patch
opatch rollback -id patch_number

# Check for conflicts before applying
opatch prereq CheckConflictAgainstOHWithDetail -ph /patch/directory

# Query if patch is an online patch
opatch query -is_online_patch /patch/directory
opatch query /patch/directory -all

# Apply online patch (no shutdown required)
opatch apply   # For online patches, no shutdown needed
```

### OPatch Prerequisite Checks
Before applying any patch:
1. Check OPatch version is compatible
2. Check for conflicts with installed patches
3. Review README file for special instructions
4. Backup database and Oracle home

## A.5 Online Patching

### Overview
Online patches fix bugs on running instances without shutdown:
- Install, enable, and disable without instance restart
- No relinking of Oracle binary required
- Used for small-scope bug fixes and diagnostic patches

### Online Patch Lifecycle
```bash
# Install online patch
opatch apply /patch/location

# Patch is automatically enabled after install

# Disable an online patch (without uninstalling)
# (Managed via Oracle internals)

# Uninstall online patch
opatch rollback -id patch_number
```

### Online vs. Conventional Patching
| Feature | Conventional | Online |
|---------|-------------|--------|
| Downtime required | Yes | No |
| Installation tool | OPatch | OPatch |
| Install time | Minutes | Seconds |
| Persistence | Yes | Yes |
| Works in RAC | Yes | Yes |
| Conflict detection | Yes | Yes |

### Online Patching Considerations
- Consumes extra memory (~1 OS page per running Oracle process; typically 4 KB on Linux x86, 8 KB on Solaris SPARC64)
- Small delay before all Oracle processes pick up the patch
- Not all bug fixes available as online patches
- Use conventional patches when downtime is feasible
- Must uninstall online patch before applying conventional patch covering same fix

## A.6 Enterprise Manager Cloud Control: My Oracle Support Integration

Enterprise Manager Cloud Control is integrated with My Oracle Support:
- Automatically alerts administrators to new critical patches
- Patch Wizard: Select and review interim patches from within EM
- Download patches directly from MOS into EM patch cache
- Stage patches on target systems
- Create customizable patch application scripts
- Automatically updates OUI inventory as patches are applied

### Accessing Patches & Updates in EM
Enterprise > Provisioning and Patching > Patches & Updates

### Patch Advisor
Find recommended patches for:
- A specific product and release
- Combinations of products used together

---

# QUICK REFERENCE: Key Oracle Commands

## SQL*Plus Session Commands
```sql
CONN / AS SYSDBA
CONN sys/password AS SYSDBA
SHOW PARAMETER parameter_name
SHOW SGA
SET LINESIZE 200
SET PAGESIZE 100
SPOOL /tmp/output.txt
@/path/to/script.sql
DESC table_name
```

## Database State Management
```sql
STARTUP NOMOUNT | MOUNT | OPEN | RESTRICT | FORCE
SHUTDOWN NORMAL | TRANSACTIONAL | IMMEDIATE | ABORT
ALTER DATABASE MOUNT;
ALTER DATABASE OPEN;
ALTER DATABASE OPEN READ ONLY;
ALTER DATABASE OPEN RESETLOGS;
ALTER DATABASE ARCHIVELOG;
ALTER DATABASE NOARCHIVELOG;
ALTER DATABASE FLASHBACK ON;
ALTER DATABASE ENABLE BLOCK CHANGE TRACKING USING FILE '...';
```

## Key Data Dictionary Views
```sql
-- Users and Security
DBA_USERS, DBA_SYS_PRIVS, DBA_TAB_PRIVS, DBA_ROLE_PRIVS
DBA_ROLES, DBA_PROFILES, DBA_TS_QUOTAS

-- Storage
DBA_TABLESPACES, DBA_DATA_FILES, DBA_TEMP_FILES, DBA_FREE_SPACE
DBA_SEGMENTS, DBA_EXTENTS, DBA_INDEXES

-- Objects
DBA_TABLES, DBA_INDEXES, DBA_VIEWS, DBA_SEQUENCES
DBA_SYNONYMS, DBA_CONSTRAINTS, DBA_IND_COLUMNS

-- Performance
V$SESSION, V$SQL, V$SQLTEXT, V$PROCESS, V$BGPROCESS
V$SGA, V$SGASTAT, V$PARAMETER, V$INSTANCE, V$DATABASE
V$LOG, V$LOGFILE, V$DATAFILE, V$CONTROLFILE
V$ACTIVE_SESSION_HISTORY, V$SYSTEM_EVENT, V$SESSION_WAIT
DBA_HIST_SNAPSHOT, DBA_HIST_SYSSTAT, DBA_HIST_SQL_SUMMARY

-- Auditing
DBA_AUDIT_TRAIL, UNIFIED_AUDIT_TRAIL, DBA_FGA_AUDIT_TRAIL
DBA_STMT_AUDIT_OPTS, DBA_PRIV_AUDIT_OPTS, DBA_OBJ_AUDIT_OPTS

-- Scheduler
DBA_SCHEDULER_JOBS, DBA_SCHEDULER_JOB_LOG, DBA_SCHEDULER_JOB_RUN_DETAILS
DBA_SCHEDULER_PROGRAMS, DBA_SCHEDULER_SCHEDULES

-- Resource Manager
DBA_RSRC_PLANS, DBA_RSRC_CONSUMER_GROUPS, DBA_RSRC_PLAN_DIRECTIVES
V$RSRC_PLAN, V$RSRC_CONSUMER_GROUP

-- RMAN
V$BACKUP, V$BACKUP_SET, V$BACKUP_DATAFILE, RC_BACKUP_SET (catalog)
V$DATABASE_BLOCK_CORRUPTION

-- Undo
V$UNDOSTAT, V$TRANSACTION, V$ROLLSTAT
DBA_UNDO_EXTENTS

-- Flashback
V$FLASHBACK_DATABASE_LOG, DBA_FLASHBACK_ARCHIVE
RECYCLEBIN, DBA_RECYCLEBIN
```

## RMAN Quick Reference
```sql
RMAN> BACKUP DATABASE [COMPRESSED] [PLUS ARCHIVELOG];
RMAN> BACKUP TABLESPACE users;
RMAN> BACKUP ARCHIVELOG ALL [DELETE INPUT];
RMAN> RESTORE DATABASE;
RMAN> RECOVER DATABASE;
RMAN> LIST BACKUP SUMMARY;
RMAN> CROSSCHECK BACKUP;
RMAN> DELETE OBSOLETE;
RMAN> DELETE EXPIRED BACKUP;
RMAN> VALIDATE DATABASE;
RMAN> REPORT NEED BACKUP;
RMAN> REPORT OBSOLETE;
RMAN> SHOW ALL;
RMAN> LIST FAILURE;
RMAN> ADVISE FAILURE;
RMAN> REPAIR FAILURE;
```

---

*Oracle Database 12c Administration Workshop — Complete Educational Reference*
*Compiled from Oracle University Training Materials*
*Copyright © 2014, Oracle and/or its affiliates. All rights reserved.*
