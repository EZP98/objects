import React, { useState } from 'react';

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  content?: string;
}

interface FileExplorerProps {
  files: FileNode[];
  onFileSelect: (file: FileNode) => void;
  selectedFile?: string;
  projectName?: string;
}

const FileIcon: React.FC<{ type: 'file' | 'folder'; name: string; isOpen?: boolean }> = ({ type, name, isOpen }) => {
  if (type === 'folder') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8, flexShrink: 0 }}>
        <path
          d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
          fill={isOpen ? '#a78bfa' : '#8b8b8b'}
          stroke={isOpen ? '#a78bfa' : '#8b8b8b'}
          strokeWidth="1"
        />
      </svg>
    );
  }

  // File icons based on extension
  const ext = name.split('.').pop()?.toLowerCase() || '';
  let color = '#6b6b6b';

  if (['tsx', 'jsx'].includes(ext)) color = '#61dafb';
  else if (['ts'].includes(ext)) color = '#3178c6';
  else if (['js'].includes(ext)) color = '#f7df1e';
  else if (['css', 'scss'].includes(ext)) color = '#a78bfa';
  else if (['html'].includes(ext)) color = '#e34f26';
  else if (['json'].includes(ext)) color = '#6b6b6b';
  else if (['md'].includes(ext)) color = '#519aba';
  else if (['svg', 'png', 'jpg', 'jpeg', 'gif'].includes(ext)) color = '#a074c4';

  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8, flexShrink: 0 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke={color} strokeWidth="1.5"/>
      <polyline points="14,2 14,8 20,8" fill="none" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
};

const FileTreeItem: React.FC<{
  node: FileNode;
  depth: number;
  onSelect: (file: FileNode) => void;
  selectedPath?: string;
}> = ({ node, depth, onSelect, selectedPath }) => {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const isSelected = node.path === selectedPath;
  const hasChildren = node.type === 'folder' && node.children && node.children.length > 0;

  const handleClick = () => {
    if (node.type === 'folder') {
      setIsOpen(!isOpen);
    } else {
      onSelect(node);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 12px',
          paddingLeft: 12 + depth * 12,
          cursor: 'pointer',
          background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          borderRadius: 6,
          margin: '1px 6px',
          fontSize: 13,
          color: isSelected ? '#e9e8e3' : '#8a8a8a',
          userSelect: 'none',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            e.currentTarget.style.color = '#e9e8e3';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#8a8a8a';
          }
        }}
      >
        {node.type === 'folder' && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5a5a5a"
            strokeWidth="2.5"
            style={{
              marginRight: 6,
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
              flexShrink: 0,
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
        {node.type === 'file' && <span style={{ width: 16, marginRight: 6 }} />}
        <FileIcon type={node.type} name={node.name} isOpen={isOpen} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isSelected ? 500 : 400 }}>
          {node.name}
        </span>
      </div>
      {hasChildren && isOpen && (
        <div>
          {node.children!.map((child, i) => (
            <FileTreeItem
              key={child.path || i}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  onFileSelect,
  selectedFile,
  projectName = 'Project',
}) => {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#111111',
      borderRight: '1px solid rgba(255, 255, 255, 0.06)',
      minWidth: 180,
      maxWidth: 240,
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span style={{ color: '#e9e8e3', fontWeight: 500, fontSize: 13 }}>{projectName}</span>
        </div>
        <button
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 4,
            color: '#5a5a5a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s ease',
          }}
          title="Refresh"
          onMouseEnter={(e) => e.currentTarget.style.color = '#8a8a8a'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#5a5a5a'}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {/* File Tree */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '8px 0',
      }}>
        {files.length === 0 ? (
          <div style={{
            padding: 20,
            textAlign: 'center',
            color: '#5a5a5a',
            fontSize: 12,
          }}>
            No files loaded.<br/>
            Click "Load Project" to start.
          </div>
        ) : (
          files.map((node, i) => (
            <FileTreeItem
              key={node.path || i}
              node={node}
              depth={0}
              onSelect={onFileSelect}
              selectedPath={selectedFile}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        fontSize: 11,
        color: '#404040',
        flexShrink: 0,
      }}>
        {files.length > 0 ? `${countFiles(files)} files` : 'Empty project'}
      </div>
    </div>
  );
};

// Helper to count total files
function countFiles(nodes: FileNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === 'file') count++;
    if (node.children) count += countFiles(node.children);
  }
  return count;
}

export default FileExplorer;
