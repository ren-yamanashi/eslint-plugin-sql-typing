-- Sample database schema for eslint-plugin-sql-typing examples

-- Users table with various column types
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  age INT,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  status ENUM('pending', 'active', 'inactive') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  metadata JSON
);

-- Posts table for JOIN examples
CREATE TABLE posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  published TINYINT(1) NOT NULL DEFAULT 0,
  view_count BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Comments table for nested JOIN examples
CREATE TABLE comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sample data
INSERT INTO users (name, email, age, balance, status) VALUES
  ('Alice', 'alice@example.com', 30, 1000.50, 'active'),
  ('Bob', 'bob@example.com', 25, 500.00, 'active'),
  ('Charlie', NULL, 35, 0.00, 'pending');

INSERT INTO posts (user_id, title, content, published, view_count) VALUES
  (1, 'Hello World', 'This is my first post', 1, 100),
  (1, 'Draft Post', 'Work in progress', 0, 0),
  (2, 'Bobs Post', 'Content here', 1, 50);

INSERT INTO comments (post_id, user_id, body) VALUES
  (1, 2, 'Great post!'),
  (1, 3, 'Thanks for sharing'),
  (3, 1, 'Nice one Bob');
