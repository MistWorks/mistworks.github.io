document.addEventListener('DOMContentLoaded', () => {
    const sidebarNav = document.getElementById('sidebar-nav');
    const contentArea = document.getElementById('content-area');
    const tocList = document.getElementById('toc-list');
    const breadcrumbs = document.getElementById('breadcrumbs');
    const footerProjectLink = document.getElementById('footer-project-link');
    const logoDocs = document.getElementById('logo-docs');
    const homeLink = document.getElementById('home-link');

    const navMist = document.getElementById('nav-mist');
    const navMinit = document.getElementById('nav-minit');
    const navMistic = document.getElementById('nav-mistic');

    const projects = [
        { id: 'mist', name: 'Mist', repo: 'MistWorks/Mist', path: 'docs', branch: 'main', desc: 'A lightweight x86_64 kernel written in C and Assembly.' },
        { id: 'minit', name: 'Minit', repo: 'MistWorks/Minit', path: 'docs', branch: 'main', desc: 'Simple, straightforward, and hardcoded bootloader.' },
        { id: 'mistic', name: 'Mistic', repo: 'MistWorks/Mistic', path: 'docs', branch: 'main', desc: 'Bare-metal C library for system-level projects.' },
        { id: 'docs', name: 'General', repo: 'MistWorks/Docs', path: '', branch: 'main', desc: 'General documentation and project-wide guides.' }
    ];

    const fileCache = {};

    function initSidebar() {
        sidebarNav.innerHTML = '';
        projects.forEach(project => {
            const group = document.createElement('div');
            group.className = 'project-group';

            const title = document.createElement('div');
            title.className = 'project-title';
            title.innerHTML = `${project.name} <span class="toggle-icon">▶</span>`;
            
            const fileList = document.createElement('div');
            fileList.className = 'project-files';
            fileList.id = `files-${project.id}`;

            group.appendChild(title);
            group.appendChild(fileList);
            sidebarNav.appendChild(group);

            title.addEventListener('click', () => {
                const isOpen = title.classList.contains('open');
                document.querySelectorAll('.project-title').forEach(el => el.classList.remove('open'));
                document.querySelectorAll('.project-files').forEach(el => el.classList.remove('open'));
                
                if (!isOpen) {
                    title.classList.add('open');
                    fileList.classList.add('open');
                    loadProjectFiles(project, fileList);
                }
            });
        });
    }

    function loadHomePage() {
        breadcrumbs.innerHTML = '';
        logoDocs.style.display = 'none';
        footerProjectLink.innerHTML = `<span>MistWorks</span>`;
        
        tocList.innerHTML = '';
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        contentArea.style.padding = '0';

        let cardsHtml = '';
        projects.forEach(p => {
            cardsHtml += `
                <div class="home-card" onclick="openProjectReadme('${p.id}')">
                    <h3>${p.name}</h3>
                    <p>${p.desc}</p>
                </div>
            `;
        });

        contentArea.innerHTML = `
            <div style="padding: 40px 0;">
                <h1 style="border:none; margin-bottom: 10px;">Welcome to MistWorks</h1>
                <p style="font-size: 1.1rem; color: #8b949e; margin-bottom: 40px;">
                    Open-source low-level development. Select a project to start reading its documentation.
                </p>
                <div class="home-grid">
                    ${cardsHtml}
                </div>
            </div>
        `;
    }

    window.openProjectReadme = async function(projectId) {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const fileContainer = document.getElementById(`files-${projectId}`);
        if (!fileContainer.classList.contains('open')) {
            document.querySelectorAll('.project-title').forEach(el => el.classList.remove('open'));
            document.querySelectorAll('.project-files').forEach(el => el.classList.remove('open'));
            
            const title = fileContainer.previousElementSibling;
            title.classList.add('open');
            fileContainer.classList.add('open');
            
            await loadProjectFiles(project, fileContainer); 
        }

        let readmeLink = null;
        setTimeout(() => {
            const links = fileContainer.querySelectorAll('.nav-item');
            links.forEach(link => {
                if (link.textContent.trim().toLowerCase() === 'readme') {
                    readmeLink = link;
                }
            });

            if (readmeLink) {
                readmeLink.click();
            } else {
                if (links.length > 0) links[0].click();
            }
        }, 300);
    };

    homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        loadHomePage();
    });

    async function loadProjectFiles(project, container) {
        if (fileCache[project.id]) return;
        container.innerHTML = '<div class="loading-text" style="text-align:left; margin: 5px 0;">Loading tree...</div>';

        try {
            const url = `https://api.github.com/repos/${project.repo}/git/trees/${project.branch}?recursive=1`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch tree');
            const data = await response.json();
            
            const basePath = project.path ? project.path + '/' : '';
            const mdFiles = data.tree.filter(item => 
                item.type === 'blob' && 
                item.path.startsWith(basePath) && 
                item.path.endsWith('.md')
            );

            if (mdFiles.length === 0) {
                container.innerHTML = '<div class="loading-text" style="text-align:left; margin: 5px 0;">No files.</div>';
                return;
            }

            container.innerHTML = '';
            buildTree(mdFiles, container, project);

            fileCache[project.id] = true;
        } catch (error) {
            console.error(error);
            container.innerHTML = '<div class="loading-text" style="color:#ff7b72; text-align:left;">Error loading files.</div>';
        }
    }

    function buildTree(files, container, project) {
        const tree = {};
        
        files.forEach(file => {
            let relativePath = file.path;
            if (project.path && relativePath.startsWith(project.path + '/')) {
                relativePath = relativePath.substring(project.path.length + 1);
            }
            
            const parts = relativePath.split('/');
            let current = tree;
            
            parts.forEach((part, index) => {
                if (index === parts.length - 1) {
                    current[part] = { type: 'file', data: file };
                } else {
                    if (!current[part]) current[part] = { type: 'folder', children: {} };
                    current = current[part].children;
                }
            });
        });

        function renderTree(node, parentElement) {
            const keys = Object.keys(node).sort((a, b) => {
                const isFolderA = node[a].type === 'folder';
                const isFolderB = node[b].type === 'folder';
                if (isFolderA && !isFolderB) return -1;
                if (!isFolderA && isFolderB) return 1;
                return a.localeCompare(b);
            });

            keys.forEach(key => {
                const item = node[key];
                
                if (item.type === 'folder') {
                    const folderTitle = document.createElement('div');
                    folderTitle.className = 'folder-title';
                    folderTitle.innerHTML = `<span class="icon">▶</span> ${key}`;
                    
                    const folderContent = document.createElement('div');
                    folderContent.className = 'folder-content';

                    folderTitle.addEventListener('click', () => {
                        folderTitle.classList.toggle('open');
                        folderContent.classList.toggle('open');
                    });

                    parentElement.appendChild(folderTitle);
                    parentElement.appendChild(folderContent);
                    
                    renderTree(item.children, folderContent);
                } else {
                    const link = document.createElement('div');
                    link.className = 'nav-item';
                    const displayName = key.replace('.md', '').replace(/-/g, ' ');
                    link.textContent = displayName;
                    
                    link.dataset.path = item.data.path; 
                    
                    link.addEventListener('click', (e) => {
                        e.stopPropagation();
                        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
                        link.classList.add('active');
                        contentArea.style.padding = '';
                        
                        const rawUrl = `https://raw.githubusercontent.com/${project.repo}/${project.branch}/${item.data.path}`;
                        loadMarkdown(rawUrl, project.name, displayName, project.repo);
                    });
                    
                    parentElement.appendChild(link);
                }
            });
        }

        renderTree(tree, container);
    }

    async function loadMarkdown(url, projectName, fileName, repoName) {
        contentArea.innerHTML = '<div class="loading-text">Loading content...</div>';
        tocList.innerHTML = '';
        logoDocs.style.display = 'inline';
        
        try {
            const relativePath = url.split('raw.githubusercontent.com/')[1].split('/').slice(2).join('/');
            const treeLinks = document.querySelectorAll('.nav-item');
            let found = false;
            
            treeLinks.forEach(link => {
                if (link.dataset.path && relativePath.includes(link.dataset.path)) {
                    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
                    link.classList.add('active');
                    found = true;
                    
                    let parent = link.parentElement;
                    while (parent && parent.classList.contains('folder-content')) {
                        parent.classList.add('open');
                        const folderTitle = parent.previousElementSibling;
                        if (folderTitle && folderTitle.classList.contains('folder-title')) {
                            folderTitle.classList.add('open');
                        }
                        parent = parent.parentElement;
                    }
                }
            });

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed');
            const markdownText = await response.text();
            
            breadcrumbs.innerHTML = `
                <span class="root">MistWorks</span>
                <span class="sep">/</span>
                <span>${projectName}</span>
                <span class="sep">/</span>
                <span class="current">${fileName}</span>
            `;
            footerProjectLink.innerHTML = `<a href="https://github.com/${repoName}" target="_blank">View source on GitHub</a>`;

            const urlParts = url.split('/');
            urlParts.pop(); 
            const baseUrl = urlParts.join('/') + '/';

            let processedText = markdownText.replace(/(!?\[.*?\]\()(.*?)(\))/g, (match, p1, p2, p3) => {
                const linkPath = p2.trim();
                if (linkPath.match(/^(https?:\/\/|#|mailto:)/)) return match;
                const cleanPath = linkPath.replace(/^(\.\/|\/)/, '');
                return `${p1}${baseUrl}${cleanPath}${p3}`;
            });

            const htmlContent = marked.parse(processedText);
            contentArea.innerHTML = htmlContent;

            contentArea.querySelectorAll('a').forEach(link => {
                const href = link.getAttribute('href');
                if (href.includes('raw.githubusercontent.com') && href.endsWith('.md')) {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        contentArea.innerHTML = '<div class="loading-text">Loading document...</div>';
                        const newFileName = href.split('/').pop().replace('.md', '').replace(/-/g, ' ');
                        loadMarkdown(href, projectName, newFileName, repoName);
                    });
                } else if (href.match(/^(https?:\/\/|mailto:)/)) {
                    link.setAttribute('target', '_blank');
                    link.setAttribute('rel', 'noopener noreferrer');
                }
            });

            const headings = contentArea.querySelectorAll('h2, h3');
            headings.forEach((heading, index) => {
                if (!heading.id) heading.id = `heading-${index}`;
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = `#${heading.id}`;
                a.textContent = heading.innerText;
                if (heading.tagName.toLowerCase() === 'h3') {
                    a.style.paddingLeft = '20px';
                    a.style.fontSize = '0.8rem';
                }
                li.appendChild(a);
                tocList.appendChild(li);
            });

            document.querySelector('.content').scrollTop = 0;

        } catch (error) {
            console.error(error);
            contentArea.innerHTML = '<h1>Error</h1><p>Could not load document.</p>';
        }
    }

    navMist.addEventListener('click', (e) => { e.preventDefault(); autoOpenProject('mist'); });
    navMinit.addEventListener('click', (e) => { e.preventDefault(); autoOpenProject('minit'); });
    navMistic.addEventListener('click', (e) => { e.preventDefault(); autoOpenProject('mistic'); });

    function autoOpenProject(projectId) {
        const title = document.querySelector(`#files-${projectId}`).previousElementSibling;
        if (!title.classList.contains('open')) {
            title.click();
        }
    }

    initSidebar();
    loadHomePage();
});
