import { createContext, useContext, useState, useCallback } from 'react';

interface Project {
  id: string;
  name: string;
  absPath: string;
  gitBranch: string;
}

interface ProjectContextType {
  project: Project | null;
  setProject: (project: Project | null) => void;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProjectState] = useState<Project | null>(null);

  const setProject = useCallback((p: Project | null) => {
    setProjectState(p);
  }, []);

  return (
    <ProjectContext.Provider value={{ project, setProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within ProjectProvider');
  return context;
}
