" Configuration:
" g:enhance_prompt_command - The command to run (default: 'npx enhance-prompt')
"   Example: let g:enhance_prompt_command = 'node ~/projects/ai-prompt-enhancer/dist/enhance-prompt.js'
"
" g:enhance_prompt_env - Environment variables to prepend to the command
"   Example: let g:enhance_prompt_env = 'NODENV_VERSION=22.18.0'
"
" g:enhance_prompt_debug - Show stderr output for debugging (default: 0)
"   Example: let g:enhance_prompt_debug = 1
"   Or toggle with: :EnhancePromptDebugToggle

function! EnhancePrompt()
    " 1. Get the visual selection range
    let [line_start, column_start] = getpos("'<")[1:2]
    let [line_end, column_end] = getpos("'>")[1:2]
    let lines = getline(line_start, line_end)

    " 2. Join lines into a single string
    let selected_text = join(lines, "\n")

    " 3. Get the current working directory
    let cwd = getcwd()

    " 4. Build command components
    let l:env_prefix = exists('g:enhance_prompt_env') ? g:enhance_prompt_env . ' ' : ''
    let l:base_cmd = exists('g:enhance_prompt_command') ? g:enhance_prompt_command : 'npx enhance-prompt'
    let l:debug = exists('g:enhance_prompt_debug') && g:enhance_prompt_debug

    " 5. Construct the shell command
    " Redirect stderr based on debug setting
    let l:stderr_redirect = l:debug ? ' 2>&1' : ' 2>/dev/null'
    let cmd = "echo " . shellescape(selected_text) . " | " . l:env_prefix . l:base_cmd . " " . shellescape(cwd) . l:stderr_redirect

    " 6. Show loading indicator before the blocking call
    echohl WarningMsg
    echo "Enhancing prompt..."
    echohl None
    redraw

    " 7. Execute and capture output
    let output = system(cmd)
    let exit_code = v:shell_error

    " 8. Replace the visual selection with the output
    execute line_start . "," . line_end . "delete"
    call append(line_start - 1, split(output, "\n"))

    " 9. Show completion message
    if exit_code == 0
        echohl MoreMsg
        echo "Prompt enhanced successfully"
        echohl None
    else
        echohl ErrorMsg
        echo "Prompt enhancement completed with errors (exit code: " . exit_code . ")"
        if !l:debug
            echo "Run :EnhancePromptDebugToggle and retry to see error details"
        endif
        echohl None
    endif
endfunction

" Toggle debug mode
function! EnhancePromptDebugToggle()
    if exists('g:enhance_prompt_debug') && g:enhance_prompt_debug
        let g:enhance_prompt_debug = 0
        echo "EnhancePrompt debug mode: OFF"
    else
        let g:enhance_prompt_debug = 1
        echo "EnhancePrompt debug mode: ON"
    endif
endfunction

" Commands
" :EnhancePrompt enhances the current visual selection (accepts a range so it
" can be invoked from a visual-mode mapping, e.g. :EnhancePrompt or
" :'<,'>EnhancePrompt). The range is accepted but ignored; the function reads
" the '< and '> visual marks directly.
command! -range EnhancePrompt call EnhancePrompt()
command! EnhancePromptDebugToggle call EnhancePromptDebugToggle()

" Map to a convenient key binding (optional)
" Usage: visually select text, then press <Leader>e
vnoremap <Leader>e :<C-u>call EnhancePrompt()<CR>