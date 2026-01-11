function! EnhancePrompt()
    " 1. Get the visual selection range
    let [line_start, column_start] = getpos("'<")[1:2]
    let [line_end, column_end] = getpos("'>")[1:2]
    let lines = getline(line_start, line_end)

    " 2. Join lines into a single string
    let selected_text = join(lines, "\n")

    " 3. Get the current working directory
    let cwd = getcwd()

    " 4. Construct the shell command using npx to run the enhancer
    " The text is passed via stdin, cwd as argument
    let cmd = "echo " . shellescape(selected_text) . " | npx enhance-prompt " . shellescape(cwd)

    " 5. Execute and capture output
    let output = system(cmd)

    " 6. Replace the visual selection with the output
    execute line_start . "," . line_end . "delete"
    call append(line_start - 1, split(output, "\n"))
endfunction

" Map to a convenient key binding (optional)
" Usage: visually select text, then press <Leader>e
vnoremap <Leader>e :<C-u>call EnhancePrompt()<CR>
