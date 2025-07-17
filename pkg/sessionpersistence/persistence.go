package sessionpersistence

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"

	"github.com/openshift/console/pkg/auth"
	"github.com/openshift/console/pkg/auth/sessions"
	klog "k8s.io/klog/v2"
)

// SessionPersistenceManager handles session persistence operations
type SessionPersistenceManager struct {
	sessionDir    string
	authenticator auth.Authenticator
}

// New creates a new session persistence manager
func New(sessionDir string) *SessionPersistenceManager {
	return &SessionPersistenceManager{
		sessionDir: sessionDir,
	}
}

// SetAuthenticator sets the authenticator for session persistence operations
func (m *SessionPersistenceManager) SetAuthenticator(authenticator auth.Authenticator) {
	m.authenticator = authenticator
}

// GetSessionsFile returns the path to the sessions file in the session directory
func (m *SessionPersistenceManager) GetSessionsFile() string {
	return filepath.Join(m.sessionDir, "console-sessions.json")
}

// RestoreSessions tries to restore sessions from a previous run
func (m *SessionPersistenceManager) RestoreSessions() {
	// Only restore sessions if session directory is explicitly configured
	if m.sessionDir == "" {
		klog.V(4).Info("Session directory not configured, skipping session restoration")
		return
	}

	if m.authenticator == nil {
		klog.V(4).Info("No authenticator available for session restoration")
		return
	}

	// Type assert to SessionPersister interface
	persister, ok := m.authenticator.(auth.SessionPersister)
	if !ok {
		klog.V(4).Info("Authenticator does not support session persistence")
		return
	}

	sessionsFile := m.GetSessionsFile()

	if _, err := os.Stat(sessionsFile); os.IsNotExist(err) {
		klog.V(4).Infof("No sessions file found at %q, starting with empty sessions", sessionsFile)
		return
	}

	data, err := ioutil.ReadFile(sessionsFile)
	if err != nil {
		klog.Warningf("Failed to read sessions file %q: %v", sessionsFile, err)
		return
	}

	var export sessions.SessionExport
	if err := json.Unmarshal(data, &export); err != nil {
		klog.Warningf("Failed to parse sessions file %q: %v", sessionsFile, err)
		return
	}

	if err := persister.ImportSessions(&export); err != nil {
		klog.Errorf("Failed to import sessions from %q: %v", sessionsFile, err)
		return
	}

	klog.Infof("Successfully restored %d sessions from previous run", len(export.Sessions))

	// Delete the sessions file after successful import
	if err := os.Remove(sessionsFile); err != nil {
		klog.Warningf("Failed to delete sessions file %q after import: %v", sessionsFile, err)
	} else {
		klog.V(4).Infof("Deleted sessions file %q after successful import", sessionsFile)
	}
}

// PersistSessions saves current sessions
func (m *SessionPersistenceManager) PersistSessions() {
	// Only persist sessions if session directory is explicitly configured
	if m.sessionDir == "" {
		klog.V(4).Info("Session directory not configured, skipping session persistence")
		return
	}

	if m.authenticator == nil {
		klog.V(4).Info("No authenticator available for session persistence")
		return
	}

	// Type assert to SessionPersister interface
	persister, ok := m.authenticator.(auth.SessionPersister)
	if !ok {
		klog.V(4).Info("Authenticator does not support session persistence")
		return
	}

	export, err := persister.ExportSessions()
	if err != nil {
		klog.Errorf("Failed to export sessions: %v", err)
		return
	}

	if len(export.Sessions) == 0 {
		klog.V(4).Info("No active sessions to persist")
		return
	}

	sessionsFile := m.GetSessionsFile()
	data, err := json.MarshalIndent(export, "", "  ")
	if err != nil {
		klog.Errorf("Failed to serialize sessions: %v", err)
		return
	}

	if err := ioutil.WriteFile(sessionsFile, data, 0600); err != nil {
		klog.Errorf("Failed to write sessions file %q: %v", sessionsFile, err)
		return
	}

	klog.Infof("Persisted %d sessions to %q", len(export.Sessions), sessionsFile)
}

// ValidateSessionDirectory validates that the session directory exists and is writeable
func ValidateSessionDirectory(sessionDir string) error {
	if sessionDir == "" {
		return nil // No validation needed if not provided
	}

	// Check if directory exists and is accessible
	if _, err := os.Stat(sessionDir); os.IsNotExist(err) {
		return &ValidationError{
			Directory: sessionDir,
			Message:   "does not exist. Please create it before running the application.",
		}
	} else if err != nil {
		return &ValidationError{
			Directory: sessionDir,
			Message:   "failed to access: " + err.Error(),
		}
	}

	// Test write permissions by creating and removing a temporary file
	tempFile := filepath.Join(sessionDir, ".write-test")
	if err := ioutil.WriteFile(tempFile, []byte("test"), 0600); err != nil {
		return &ValidationError{
			Directory: sessionDir,
			Message:   "is not writeable: " + err.Error(),
		}
	}

	// Clean up test file
	if err := os.Remove(tempFile); err != nil {
		klog.Warningf("Failed to clean up test file in session directory %q: %v", sessionDir, err)
		// Don't return error here since write worked
	}

	return nil
}

// ValidationError represents a session directory validation error
type ValidationError struct {
	Directory string
	Message   string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("Session directory %q %s", e.Directory, e.Message)
}
