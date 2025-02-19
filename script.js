document.addEventListener('DOMContentLoaded', () => {
    const drumkitContainer = document.getElementById('drumkit-container');
    const searchInput = document.getElementById('kit-search');
    const categoryFilter = document.getElementById('category-filter');
    const loadingIndicator = document.getElementById('loading-indicator');
    const darkModeButton = document.getElementById('dark-mode-button');
    const body = document.body;
    const themeSelect = document.getElementById('theme-select');

    let allDrumkits = [];
    let currentCategory = 'all';
    let afterToken = null;
    let isSearching = false;

    // Function to fetch drumkits from Reddit API (Initial Load - New Posts)
    async function fetchDrumkits() {
        loadingIndicator.classList.add('loading');
        drumkitContainer.innerHTML = '';
        afterToken = null;
        isSearching = false;

        try {
            const response = await fetch(`https://www.reddit.com/r/drumkits/new.json?limit=100`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            allDrumkits = processRedditPosts(data.data.children);
            displayDrumkits(allDrumkits);
        } catch (error) {
            console.error('Error fetching drumkits:', error);
            drumkitContainer.innerHTML = `<p class="error-message">Failed to load drumkits. Please try again later.</p>`;
        } finally {
            loadingIndicator.classList.remove('loading');
        }
    }

    // Function to process Reddit API posts
    function processRedditPosts(posts) {
        return posts.map(post => {
            const postData = post.data;
            let description = postData.selftext || 'No description provided.';
            description = description.replace(/[\r\n]+/g, ' ').trim();
            const postLink = `https://www.reddit.com${postData.permalink}`;
            const postId = postData.id;

            let tags = [];
            const titleLower = postData.title.toLowerCase();
            if (titleLower.includes('808')) tags.push('808s');
            if (titleLower.includes('snare')) tags.push('snares');
            if (titleLower.includes('hihat')) tags.push('hihats');
            if (titleLower.includes('kick')) tags.push('kicks');
            if (titleLower.includes('percussion')) tags.push('percussion');
            if (titleLower.includes('full kit') || titleLower.includes('drum kit')) tags.push('full-kits');
            if (titleLower.includes('lofi') || titleLower.includes('lo-fi')) tags.push('lofi');
            if (titleLower.includes('trap')) tags.push('trap');
            if (titleLower.includes('electronic') || titleLower.includes('edm')) tags.push('electronic');
            if (titleLower.includes('acoustic')) tags.push('acoustic');
            if (titleLower.includes('free')) tags.push('free');
            if (titleLower.includes('premium')) tags.push('premium');
            if (titleLower.includes('genre')) tags.push('genre-specific');


            return {
                title: postData.title,
                description: description,
                postLink: postLink,
                tags: tags,
                categories: tags,
                postId: postId
            };
        });
    }

    // Function to display drumkits in the UI
    async function displayDrumkits(drumkits) {
        drumkitContainer.innerHTML = '';

        if (drumkits.length === 0) {
            drumkitContainer.innerHTML = `<p>No drumkits found matching your criteria.</p>`;
            return;
        }

        for (const kit of drumkits) {
            const kitCard = createKitCard(kit);
            try {
                const comments = await fetchComments(kit.postId);
                const commentsSection = createCommentsSection(comments);
                kitCard.appendChild(commentsSection);
            } catch (commentError) {
                console.error(`Error fetching comments for post ${kit.postId}:`, commentError);
                const commentsError = document.createElement('div');
                commentsError.classList.add('comments-error');
                commentsError.textContent = "Failed to load comments.";
                kitCard.appendChild(commentsError);
            }
            drumkitContainer.appendChild(kitCard);
        }
    }

    // Function to create a drumkit card HTML element
    function createKitCard(kit) {
        const kitCard = document.createElement('div');
        kitCard.classList.add('kit-card');
        kitCard.dataset.categories = kit.categories.join(' ');

        const kitBody = document.createElement('div');
        kitBody.classList.add('kit-body');
        kitBody.innerHTML = `
            <h3>${kit.title}</h3>
            <p class="description">${kit.description}</p>
            <div class="download-section">
                <a href="${kit.postLink}" class="download-button" target="_blank">
                    <i class="fas fa-external-link-alt"></i> View Post
                </a>
            </div>
        `;
        kitCard.appendChild(kitBody);

        const kitFooter = document.createElement('div');
        kitFooter.classList.add('kit-footer');
        kit.tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.classList.add('kit-tag');
            tagSpan.textContent = `#${tag}`;
            kitFooter.appendChild(tagSpan);
        });
        kitCard.appendChild(kitFooter);

        return kitCard;
    }

    // Comments Section Functions
    async function fetchComments(postId) {
        try {
            const response = await fetch(`https://www.reddit.com/r/drumkits/comments/${postId}.json?limit=5`);
            if (!response.ok) {
                throw new Error(`HTTP error fetching comments! status: ${response.status}`);
            }
            const data = await response.json();
            return data[1].data.children.map(comment => ({
                author: comment.data.author,
                body: comment.data.body
            }));
        } catch (error) {
            console.error(`Error fetching comments for post ${postId}:`, error);
            return [];
        }
    }

    function createCommentsSection(comments) {
        const commentsSection = document.createElement('div');
        commentsSection.classList.add('comments-section');
        commentsSection.innerHTML = `<h4>Comments</h4>`;

        if (comments.length === 0) {
            commentsSection.innerHTML += `<p class="no-comments">No comments yet.</p>`;
        } else {
            const commentsList = document.createElement('ul');
            comments.forEach(comment => {
                const commentItem = document.createElement('li');
                commentItem.classList.add('comment-item');
                commentItem.innerHTML = `<span class="comment-author">${comment.author}:</span> <span class="comment-body">${comment.body}</span>`;
                commentsList.appendChild(commentItem);
            });
            commentsSection.appendChild(commentsList);
        }
        return commentsSection;
    }

    // Search Functionality
    searchInput.addEventListener('input', async () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm.length < 2) {
            if (isSearching) {
                fetchDrumkits();
            }
            return;
        }

        loadingIndicator.classList.add('loading');
        drumkitContainer.innerHTML = '';
        isSearching = true;

        try {
            const response = await fetch(`https://www.reddit.com/r/drumkits/search.json?q=${searchTerm}&sort=relevance&limit=100&restrict_sr=1`);
            if (!response.ok) {
                throw new Error(`HTTP search error! status: ${response.status}`);
            }
            const data = await response.json();
            const searchResults = processRedditPosts(data.data.children);
            displayDrumkits(filterByCategory(searchResults, currentCategory));
        } catch (searchError) {
            console.error('Error during search:', searchError);
            drumkitContainer.innerHTML = `<p class="error-message">Search failed. Please try again.</p>`;
        } finally {
            loadingIndicator.classList.remove('loading');
        }
    });

    // Category Filtering
    categoryFilter.addEventListener('click', (event) => {
        if (event.target.tagName === 'A') {
            event.preventDefault();
            const selectedCategory = event.target.dataset.category;

            document.querySelectorAll('.categories-list li a').forEach(a => a.classList.remove('active-category'));
            event.target.classList.add('active-category');

            currentCategory = selectedCategory;
            const searchedKits = searchInput.value.trim() === '' ? allDrumkits : filterBySearchTerm(searchInput.value.trim());
            displayDrumkits(filterByCategory(searchedKits, currentCategory));
        }
    });

    function filterByCategory(drumkits, category) {
        if (category === 'all') {
            return drumkits;
        }
        return drumkits.filter(kit => kit.categories.includes(category));
    }

    function filterBySearchTerm(searchTerm) {
        const searchTermLower = searchTerm.toLowerCase().trim();
        return allDrumkits.filter(kit => {
            const searchText = `${kit.title} ${kit.description} ${kit.tags.join(' ')}`.toLowerCase();
            return searchText.includes(searchTermLower);
        });
    }

    // Dark Mode Toggle
    darkModeButton.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', body.classList.contains('dark-mode'));
    });


    // --- Theme Switching - **Refined Logic** ---
    themeSelect.addEventListener('change', () => {
        const selectedTheme = themeSelect.value;
        setTheme(selectedTheme); // Call setTheme function
    });

    function setTheme(themeName) {
        body.classList.remove('theme-blue', 'theme-green', 'theme-purple'); // Explicitly remove all theme classes
        if (themeName !== 'default') {
            body.classList.add(`theme-${themeName}`); // Add the selected theme class
        }
        localStorage.setItem('theme', themeName); // Store theme preference
    }

    // --- Initial Load and Preferences ---
    // Dark Mode Preference (No Change)
    if (localStorage.getItem('darkMode') === 'true') {
        body.classList.add('dark-mode');
    }

    // Theme Preference - **Use setTheme function for initial load**
    const storedTheme = localStorage.getItem('theme') || 'default';
    themeSelect.value = storedTheme;
    setTheme(storedTheme); // Apply theme using setTheme function

    fetchDrumkits();
    document.body.classList.add('loaded');
});
