const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs'); // Add bcryptjs for hashing

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect('mongodb+srv://admin:admin123@cluster0.pwhlhre.mongodb.net/toto', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB connected successfully');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

// User Schema
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    phone: String,
    semester: String,
    role: { type: String, default: 'user' }, // Set default role to 'user'
    password: String
});

const User = mongoose.model('User', userSchema);

// Registration endpoint
app.post('/register', async (req, res) => {
    const { name, email, phone, semester, role, password } = req.body;
    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ 
            name, 
            email, 
            phone, 
            semester, 
            role: role || 'user', // Use provided role or default to 'user'
            password: hashedPassword 
        });
        await user.save();
        res.status(201).json({ message: 'User registered successfully', userId: user._id });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
});

// Login endpoint
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        res.status(200).json({ message: 'Login successful', userId: user._id, name: user.name, role: user.role });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
});

// Email existence validation endpoint
app.post('/validate-email', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user) {
            return res.status(200).json({ exists: true, message: 'Email already registered' });
        } else {
            return res.status(200).json({ exists: false, message: 'Email is available' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error validating email', error: error.message });
    }
});

// Event Schema
const eventSchema = new mongoose.Schema({
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String },
    date: { type: Date, required: true },
    time: { type: String, required: true }, // Store time as string (e.g., "14:00")
    venue: { type: String, maxlength: 100 },
    created_at: { type: Date, default: Date.now }
});

const Event = mongoose.model('Event', eventSchema);

// Event creation endpoint
app.post('/events', async (req, res) => {
    const { title, description, date, time, venue } = req.body;
    try {
        const event = new Event({
            title,
            description,
            date,
            time,
            venue
        });
        await event.save();
        res.status(201).json({ message: 'Event created successfully', eventId: event._id });
    } catch (error) {
        console.error('Event creation error:', error);
        res.status(500).json({ message: 'Error creating event', error: error.message });
    }
});

// Get all events endpoint
app.get('/events', async (req, res) => {

    try {
        const events = await Event.find().sort({ created_at: -1 }); // Latest first
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching events', error: error.message });
    }
});

// Update event endpoint
app.put('/events/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, date, time, venue } = req.body;
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid event id' });
        }

        // Basic validation for required fields
        if (!title || !date || !time) {
            return res.status(400).json({ message: 'Title, date, and time are required' });
        }


        
        // Normalize inputs
        const normalized = {
            title: String(title).trim(),
            description: description == null ? undefined : String(description).trim(),
            date: date ? new Date(date) : undefined,
            time: String(time).trim(),
            venue: venue == null ? undefined : String(venue).trim()
        };

        const updatedEvent = await Event.findByIdAndUpdate(
            id,
            normalized,
            { new: true, runValidators: true }
        );
        if (!updatedEvent) {
            return res.status(404).json({ message: 'Event not found' });
        }
        return res.status(200).json({ message: 'Event updated successfully', event: updatedEvent });
    } catch (error) {
        return res.status(500).json({ message: 'Error updating event', error: error.message });
    }
});



// Delete event endpoint
app.delete('/events/:id', async (req, res) => {
    const { id } = req.params;
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid event id' });
        }
        const deletedEvent = await Event.findByIdAndDelete(id);
        if (!deletedEvent) {
            return res.status(404).json({ message: 'Event not found' });
        }
        return res.status(200).json({ message: 'Event deleted successfully', eventId: id });
    } catch (error) {
        return res.status(500).json({ message: 'Error deleting event', error: error.message });
    }
});

app.listen(3001, () => {
    console.log('Server is running on port 3001');
});
