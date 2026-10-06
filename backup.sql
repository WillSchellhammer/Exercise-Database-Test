PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE IF NOT EXISTS "all_exercises"(
  "Exercise Name" TEXT,
  "Description" TEXT,
  "Sets" INTEGER,
  "Reps" INTEGER
);
INSERT INTO "all_exercises" ("Exercise Name","Description","Sets","Reps") VALUES('Push-ups','You push down and then up',3,5);
INSERT INTO "all_exercises" ("Exercise Name","Description","Sets","Reps") VALUES('Sit-ups','You sit up and then down',2,20);
INSERT INTO "all_exercises" ("Exercise Name","Description","Sets","Reps") VALUES('5k Jog','1 mile = 1 rep',NULL,5);
CREATE TABLE IF NOT EXISTS "unselected_exercises"(
  "Exercise Name" TEXT,
  Description TEXT,
  Sets INT,
  Reps INT
);
INSERT INTO "unselected_exercises" ("Exercise Name","Description","Sets","Reps") VALUES('Push-ups','You push down and then up',3,5);
INSERT INTO "unselected_exercises" ("Exercise Name","Description","Sets","Reps") VALUES('Sit-ups','You sit up and then down',2,20);
INSERT INTO "unselected_exercises" ("Exercise Name","Description","Sets","Reps") VALUES('5k Jog','1 mile = 1 rep',NULL,5);
CREATE TABLE IF NOT EXISTS "monday"(
  "Exercise Name" TEXT,
  Description TEXT,
  Sets INT,
  Reps INT
);
INSERT INTO "monday" ("Exercise Name","Description","Sets","Reps") VALUES('N/A',NULL,NULL,NULL);
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL
);
CREATE TABLE schedule_entries (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  exercise_id INTEGER NOT NULL REFERENCES all_exercises(id),
  scheduled_date TEXT NOT NULL CHECK (scheduled_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  sets INTEGER,
  reps INTEGER,
  position INTEGER,
  UNIQUE (user_id, scheduled_date, exercise_id)
);
CREATE INDEX idx_schedule_user_date ON schedule_entries (user_id, scheduled_date);
