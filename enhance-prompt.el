;;; enhance-prompt.el --- Enhance AI prompts using Auggie SDK -*- lexical-binding: t; -*-

;; Copyright (C) 2024
;; Author: Personal Prompt Enhancer
;; Version: 1.0.0
;; Package-Requires: ((emacs "25.1"))
;; Keywords: convenience, tools, ai
;; URL: https://github.com/your-repo/vim-prompt-enhancer

;;; Commentary:

;; This package provides functionality to enhance AI prompts using the
;; Auggie SDK.  It takes selected text, sends it to the enhance-prompt
;; CLI tool, and replaces the selection with the enhanced version.
;;
;; The CLI tool uses workspace context to generate detailed, actionable
;; prompts from rough ideas.
;;
;; Installation:
;;   1. Ensure the enhance-prompt CLI is built and accessible
;;   2. Add this file to your load-path
;;   3. (require 'enhance-prompt)
;;   4. Configure keybindings as desired
;;
;; For Spacemacs:
;;   Add to dotspacemacs/user-config:
;;     (load "/path/to/enhance-prompt.el")
;;     (spacemacs/set-leader-keys "oe" 'enhance-prompt-region)

;;; Code:

(defgroup enhance-prompt nil
  "Enhance AI prompts using Auggie SDK."
  :group 'tools
  :prefix "enhance-prompt-")

(defcustom enhance-prompt-command "npx enhance-prompt"
  "Command to run the prompt enhancer.
This can be:
- \"npx enhance-prompt\" (if npm linked)
- \"node /path/to/dist/enhance-prompt.js\"
- \"/path/to/enhance-prompt\""
  :type 'string
  :group 'enhance-prompt)

(defcustom enhance-prompt-show-progress t
  "Whether to show a progress message while enhancing."
  :type 'boolean
  :group 'enhance-prompt)

(defun enhance-prompt--get-workspace-root ()
  "Get the workspace root directory.
Uses projectile if available, falls back to default-directory."
  (or (and (fboundp 'projectile-project-root)
           (projectile-project-root))
      (and (fboundp 'project-root)
           (when-let ((proj (project-current)))
             (project-root proj)))
      default-directory))

(defun enhance-prompt-region (start end)
  "Enhance the text in the region from START to END.
Replaces the selected text with an AI-enhanced version."
  (interactive "r")
  (unless (use-region-p)
    (user-error "No region selected.  Select text to enhance"))
  (let* ((selected-text (buffer-substring-no-properties start end))
         (workspace-root (enhance-prompt--get-workspace-root))
         (cmd (format "%s %s"
                      enhance-prompt-command
                      (shell-quote-argument workspace-root)))
         (output-buffer "*enhance-prompt-output*")
         result)
    ;; Show progress message
    (when enhance-prompt-show-progress
      (message "Enhancing prompt..."))
    ;; Run the command with selected text as stdin
    (with-temp-buffer
      (insert selected-text)
      (setq result
            (call-process-region (point-min) (point-max)
                                 shell-file-name
                                 t           ; delete region (replace with output)
                                 t           ; output to current buffer
                                 nil         ; no display
                                 shell-command-switch
                                 cmd))
      (setq output (buffer-string)))
    ;; Replace the region with the output
    (delete-region start end)
    (goto-char start)
    (insert output)
    ;; Clear progress message
    (when enhance-prompt-show-progress
      (message "Prompt enhanced!"))))

(defun enhance-prompt-buffer ()
  "Enhance the entire buffer content."
  (interactive)
  (enhance-prompt-region (point-min) (point-max)))

(defun enhance-prompt-paragraph ()
  "Enhance the current paragraph."
  (interactive)
  (save-excursion
    (mark-paragraph)
    (enhance-prompt-region (region-beginning) (region-end))))

;;;###autoload
(defun enhance-prompt-setup-evil-keybindings ()
  "Set up Evil mode keybindings for enhance-prompt.
Binds to <leader>e in visual state."
  (interactive)
  (when (fboundp 'evil-define-key*)
    (evil-define-key* 'visual 'global
      (kbd "<leader>e") #'enhance-prompt-region)))

;;;###autoload
(defun enhance-prompt-setup-spacemacs-keybindings ()
  "Set up Spacemacs keybindings for enhance-prompt.
Binds to SPC o e for region enhancement."
  (interactive)
  (when (fboundp 'spacemacs/set-leader-keys)
    (spacemacs/set-leader-keys
      "oe" #'enhance-prompt-region
      "oE" #'enhance-prompt-buffer)))

(provide 'enhance-prompt)

;;; enhance-prompt.el ends here
