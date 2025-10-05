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

// Get user by email (for deriving userId from stored email)
app.get('/users/by-email', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        const user = await User.findOne({ email }).select('_id name email role');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.status(200).json({ userId: user._id, name: user.name, email: user.email, role: user.role });
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching user by email', error: error.message });
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

// Event Registration Schema
const registrationSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    registeredAt: { type: Date, default: Date.now }
});

const Registration = mongoose.model('Registration', registrationSchema);

// Register user for event
app.post('/event-registrations', async (req, res) => {
    const { eventId, userId } = req.body;
    try {
        // Check if registration already exists
        const exists = await Registration.findOne({ event: eventId, user: userId });
        if (exists) {
            return res.status(400).json({ message: 'User already registered for this event' });
        }
        const registration = new Registration({ event: eventId, user: userId });
        await registration.save();
        res.status(201).json({ message: 'Registration successful', registrationId: registration._id });
    } catch (error) {
        res.status(500).json({ message: 'Error registering for event', error: error.message });
    }
});

// Get all event registrations with event title and user details
app.get('/event-registrations', async (req, res) => {
    try {
        const registrations = await Registration.find()
            .populate('event', 'title')
            .populate('user', '-password');
        res.status(200).json(registrations);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching registrations', error: error.message });
    }
});

app.listen(3001, () => {
    console.log('Server is running on port 3001');
});

// Quiz Schema
const quizQuestionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    options: {
        type: [String],
        validate: (v) => Array.isArray(v) && v.length === 4
    },
    correctAnswer: { type: Number, required: true, min: 0, max: 3 }
});

const quizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    totalMarks: { type: Number, required: true },
    creationDate: { type: Date, default: Date.now },
    questions: { type: [quizQuestionSchema], required: true }
}, { timestamps: true });

const Quiz = mongoose.model('Quiz', quizSchema);

// Create a new quiz
app.post('/quizzes', async (req, res) => {
    try {
        const { title, totalMarks, creationDate, questions } = req.body;

        if (!title || totalMarks == null || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ message: 'title, totalMarks and questions are required' });
        }

        // Basic normalization
        const normalizedQuestions = questions.map((q) => ({
            text: String(q.text || '').trim(),
            options: (q.options || []).map((opt) => String(opt || '').trim()).slice(0, 4),
            correctAnswer: Number(q.correctAnswer)
        }));

        const quiz = new Quiz({
            title: String(title).trim(),
            totalMarks: Number(totalMarks),
            creationDate: creationDate ? new Date(creationDate) : undefined,
            questions: normalizedQuestions
        });
        await quiz.save();
        return res.status(201).json({ message: 'Quiz created successfully', quizId: quiz._id });
    } catch (error) {
        return res.status(500).json({ message: 'Error creating quiz', error: error.message });
    }
});

// Get all quizzes
app.get('/quizzes', async (req, res) => {
    try {
        const quizzes = await Quiz.find().sort({ createdAt: -1 });
        return res.status(200).json(quizzes);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching quizzes', error: error.message });
    }
});

// Get a quiz for taking (hide correct answers)
app.get('/quizzes/:id/take', async (req, res) => {
    try {
        const { id } = req.params;
        const { studentId } = req.query;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid quiz id' });
        }
        if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(401).json({ message: 'studentId is required' });
        }
        const student = await User.findById(studentId).select('_id role');
        if (!student) {
            return res.status(401).json({ message: 'Invalid student' });
        }
        if (student.role && student.role.toLowerCase() === 'admin') {
            return res.status(403).json({ message: 'Admins cannot take quizzes' });
        }
        const quiz = await Quiz.findById(id);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }
        const safeQuiz = {
            _id: quiz._id,
            title: quiz.title,
            totalMarks: quiz.totalMarks,
            questions: quiz.questions.map(q => ({ text: q.text, options: q.options }))
        };
        return res.status(200).json(safeQuiz);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching quiz for taking', error: error.message });
    }
});

// Check a single question answer (returns whether correct and the correct index)
app.post('/quizzes/:id/check', async (req, res) => {
    try {
        const { id } = req.params;
        const { studentId, questionIndex, selectedIndex } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid quiz id' });
        }
        if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(401).json({ message: 'studentId is required' });
        }
        const student = await User.findById(studentId).select('_id role');
        if (!student) {
            return res.status(401).json({ message: 'Invalid student' });
        }
        if (student.role && student.role.toLowerCase() === 'admin') {
            return res.status(403).json({ message: 'Admins cannot take quizzes' });
        }
        if (typeof questionIndex !== 'number' || typeof selectedIndex !== 'number') {
            return res.status(400).json({ message: 'questionIndex and selectedIndex must be numbers' });
        }

        const quiz = await Quiz.findById(id);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }
        if (questionIndex < 0 || questionIndex >= quiz.questions.length) {
            return res.status(400).json({ message: 'Invalid question index' });
        }
        if (selectedIndex < 0 || selectedIndex > 3) {
            return res.status(400).json({ message: 'Invalid selected index' });
        }

        const correctIndex = quiz.questions[questionIndex].correctAnswer;
        const correct = selectedIndex === correctIndex;
        return res.status(200).json({ correct, correctIndex });
    } catch (error) {
        return res.status(500).json({ message: 'Error checking answer', error: error.message });
    }
});

// Quiz Attempt Schema
const quizAttemptSchema = new mongoose.Schema({
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    answers: { type: [Number], required: true },
    numCorrect: { type: Number, required: true },
    score: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now }
});

// Ensure one attempt per student per quiz
quizAttemptSchema.index({ quiz: 1, student: 1 }, { unique: true, sparse: true });

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);

// Submit quiz answers and grade
app.post('/quizzes/:id/attempts', async (req, res) => {
    try {
        const { id } = req.params;
        const { studentId, answers } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid quiz id' });
        }
        if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(401).json({ message: 'studentId is required' });
        }
        const student = await User.findById(studentId).select('_id role');
        if (!student) {
            return res.status(401).json({ message: 'Invalid student' });
        }
        if (student.role && student.role.toLowerCase() === 'admin') {
            return res.status(403).json({ message: 'Admins cannot attempt quizzes' });
        }
        if (!Array.isArray(answers)) {
            return res.status(400).json({ message: 'answers must be an array of indices' });
        }

        const quiz = await Quiz.findById(id);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        if (answers.length !== quiz.questions.length) {
            return res.status(400).json({ message: 'answers length must match number of questions' });
        }

        // Validate answer choices are within 0-3
        for (const idx of answers) {
            if (typeof idx !== 'number' || idx < 0 || idx > 3) {
                return res.status(400).json({ message: 'each answer must be an index 0-3' });
            }
        }

        // Grade
        let numCorrect = 0;
        quiz.questions.forEach((q, i) => {
            if (answers[i] === q.correctAnswer) numCorrect += 1;
        });
        const perQuestion = quiz.totalMarks / quiz.questions.length;
        const rawScore = numCorrect * perQuestion;
        const score = Math.round(rawScore * 100) / 100; // round to 2 decimals

        // Prevent duplicate attempts
        const already = await QuizAttempt.findOne({ quiz: quiz._id, student: studentId });
        if (already) {
            return res.status(409).json({ message: 'You have already attempted this quiz' });
        }

        const attempt = new QuizAttempt({
            quiz: quiz._id,
            student: studentId,
            answers,
            numCorrect,
            score
        });
        await attempt.save();

        return res.status(201).json({
            message: 'Quiz submitted successfully',
            attemptId: attempt._id,
            score,
            numCorrect,
            totalMarks: quiz.totalMarks
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error submitting quiz', error: error.message });
    }
});

// List attempts for a quiz (admin)
app.get('/quizzes/:id/attempts', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid quiz id' });
        }
        const attempts = await QuizAttempt.find({ quiz: id })
            .populate('student', '-password name email role');
        return res.status(200).json(attempts);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching attempts', error: error.message });
    }
});

// List all quiz attempts (admin view)
app.get('/quiz-attempts', async (req, res) => {
    try {
        const attempts = await QuizAttempt.find()
            .populate('quiz', 'title totalMarks')
            .populate('student', '-password name email role');
        return res.status(200).json(attempts);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching quiz attempts', error: error.message });
    }
});