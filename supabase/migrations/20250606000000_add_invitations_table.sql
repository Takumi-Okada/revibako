-- 招待テーブルを追加
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_group_id UUID NOT NULL REFERENCES review_groups(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_user_display_id VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックスを追加
CREATE UNIQUE INDEX idx_invitations_group_display_id 
ON invitations(review_group_id, invited_user_display_id);

CREATE INDEX idx_invitations_status 
ON invitations(status);

-- コメントを追加
COMMENT ON TABLE invitations IS 'レビューグループへの招待';
COMMENT ON COLUMN invitations.id IS '招待ID';
COMMENT ON COLUMN invitations.review_group_id IS 'グループID';
COMMENT ON COLUMN invitations.inviter_id IS '招待者ID';
COMMENT ON COLUMN invitations.invited_user_display_id IS '招待されるユーザーの表示ID';
COMMENT ON COLUMN invitations.status IS '招待ステータス (pending, accepted, declined)';
COMMENT ON COLUMN invitations.responded_at IS '招待に応答した日時';
COMMENT ON COLUMN invitations.created_at IS '作成日時';
COMMENT ON COLUMN invitations.updated_at IS '更新日時';